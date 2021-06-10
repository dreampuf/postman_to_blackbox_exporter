<template>
  <div class="convertor">
    <div>
      <h1>{{ title }}</h1>
    </div>
    <Forkme></Forkme>
    <div>
      <div class="flex flex-wrap mx-3 mb-6">
        <div class="w-full md:w-1/2 px-2 mb-6 md:mb-0">
          <label for="url_input">Postman Collection URLs:</label><textarea id="url_input" v-model="url_input"
                                                                           @keydown.enter="getData" rows="5" cols="80"/>
        </div>
        <div class="w-full md:w-1/2 px-2 mb-6 md:mb-0">
          <label for="blackbox_url_input">Blackbox Exporter URLs:</label><textarea id="blackbox_url_input"
                                                                                   v-model="blackbox_url_input"
                                                                                   @keydown.enter="getData" rows="5"
                                                                                   cols="80"/>
        </div>
      </div>
      <div class="flex flex-wrap mx-3 mb-6">
        <div class="w-full px-2 mb-6 md:mb-0 items-center w-full">
          <p v-if="message !== ''">{{ message }}</p>
          <button class="inline-flex" @click="getData">
            <svg v-if="is_working" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                 fill="none"
                 viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generate
          </button>
        </div>
      </div>
      <div class="flex flex-wrap mx-3 mb-6">
        <div class="w-full md:w-1/2 px-2 mb-6 md:mb-0">
          <label for="ct_blackbox">blackbox.yml</label>
          <textarea id="ct_blackbox" v-model="ct_blackbox" cols="50" rows="20"></textarea>
          <button @click="copyToClipboard(ct_blackbox)">Copy</button>
        </div>
        <div class="w-full md:w-1/2 px-2 mb-6 md:mb-0">
          <label for="ct_prometheus">prometheus.yml</label>
          <textarea id="ct_prometheus" v-model="ct_prometheus" cols="50" rows="20"></textarea>
          <button @click="copyToClipboard(ct_prometheus)">Copy</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import jsYaml from 'js-yaml'
import Forkme from "./Forkme.vue";

export default {
  name: 'Convertor',
  components: {Forkme},
  props: {
    title: String
  },
  data() {
    return {
      count: 0,
      url_input: 'https://www.postman.com/collections/58d159b05c85babf0568\nhttps://www.postman.com/collections/98256a1ee83071c5bbb7\nhttps://www.postman.com/collections/1d991f7b5a9eb95872a7',
      blackbox_url_input: 'localhost:9115',
      is_working: false,
      ct_blackbox: '',
      ct_prometheus: '',
      message: '',
      relabel_configs: []
    }
  },
  computed: {
    blackbox_urls: function () {
      return this.blackbox_url_input.split("\n")
    },
    urls: function () {
      return this.url_input.split("\n")
    }
  },
  methods: {
    async getData() {
      const [bb_result, prom_result] = this.initTemplates()
      const self = this
      self.is_working = true
      self.message = 'loading...'
      await Promise.all(this.urls.map(async (url) => {
        const res = await fetch(url)
        return await res.json()
      })).then((collections) => {
        self.is_working = false
        self.message = ''
        collections.forEach((collection) => {
          const [bb_modules, prom_scrape_configs] = self.convertPostmanToBlackBox(collection)
          for (const [key, value] of Object.entries(bb_modules)) {
            bb_result["modules"][key] = value
          }
          Array.prototype.push.apply(prom_result["scrape_configs"], prom_scrape_configs)
        })
      })
      this.ct_blackbox = jsYaml.dump(bb_result)
      this.ct_prometheus = jsYaml.dump(prom_result)
    },

    initTemplates() {
      let bb_result = {"modules": {}}
      let prom_result = {
        "global": {
          "scrape_interval": "15s",
          "evaluation_interval": "15s"
        },
        "alerting": {
          "alertmanagers": [
            {
              "static_configs": [
                {"targets": []}
              ]
            }
          ]
        },
        "rule_files": [],
        "scrape_configs": [
          {
            "job_name": "blackbox",
            "metrics_path": "/metrics",
            "static_configs": [{"targets": this.blackbox_urls}]
          }
        ]
      }
      return [bb_result, prom_result]
    },

    convertPostmanToBlackBox(ct) {
      if (!ct) {
        return
      }
      const self = this
      const varFiller = self.filledWithVariable(ct["variable"])
      const authFiller = self.fillWithAuth(ct["auth"])
      const collection_name = ct["info"] && ct["info"]["name"] || "default"
      const bb_modules = {}
      const prom_scrape_configs = []
      this.handleFolder(ct, {bb_modules, prom_scrape_configs, authFiller, varFiller, prefix: collection_name})
      return [bb_modules, prom_scrape_configs]
    },
    getherName(prefix, item) {
      return item['name'] ? `${prefix}_${item['name']}` : prefix
    },
    handleFolder(item, options) {
      if (item === undefined) {
        return
      }
      /* deal with multiple versions of postman collection spec */
      [item.item, item.requests].forEach((i)=> {
        if (i === undefined) {
          return
        }
        if (i.url) {
          this.handleRequest(i, options)
        } else if (Array.isArray(i)) {
          i.forEach((j)=>{
            this.handleFolder(j, {...options, prefix:this.getherName(options.prefix, i)})
          })
        }
      })
      if (item.url) {
        this.handleRequest(item, options)
      } else if (item.request) {
        this.handleRequest(item.request, {...options, prefix: this.getherName(options.prefix, item)})
      }
    },
    handleRequest(item, {bb_modules, prom_scrape_configs, authFiller, varFiller, prefix}) {
      let blackbox_module = {
        "prober": "http",
        "timeout": "20s",
        "http": {
          "method": item.method,
          "preferred_ip_protocol": "ip4",
        }
      }
      if (item.header && item.header.length > 0) {
        if (blackbox_module["http"]["headers"] === undefined) {
          blackbox_module["http"]["headers"] = {}
        }
        item.header.forEach((i) => {
          blackbox_module["http"]["headers"][i["key"]] = i["value"]
        })
      }
      if (item.body) {
        blackbox_module["http"]["body"] = varFiller(item.body)
      }
      authFiller["header"](blackbox_module["http"])
      const module_name = this.getherName(prefix, item).toLowerCase().replaceAll(/[ \-#]+/g, "_")
      bb_modules[module_name] = blackbox_module

      let scrape_config = {
        "job_name": module_name,
        "metrics_path": "/probe",
        "scrape_interval": "5s",
        "params": {
          "module": [module_name],
          "target": [authFiller["query"](varFiller(item.url))]
        },
        "static_configs": [
          {"targets": this.blackbox_urls}
        ],
        "relabel_configs": this.relabel_configs
      }
      prom_scrape_configs.push(scrape_config)
    },
    filledWithVariable(variables) {
      return (str) => {
        if (!str) {
          return str
        }
        let c = str
        if (typeof c === "object") {
          c = c.raw
        }
        if (variables) {
          variables.forEach((i) => {
            c = c.replaceAll(`{{${i.key}}}`, i.value)
          })
        }
        return c
      }
    },
    fillWithAuth(auth) {
      if (!auth) {
        return {"query": (url) => url, "header": (http) => http}
      }
      const a = auth[auth.type]
      return {
        "query": (url) => {
          if (a["in"] !== "query") {
            return url
          }
          if (url.indexOf("?") !== -1) {
            return `${url}&${a["key"]}=${a["value"]}`
          } else {
            return `${url}?${a["key"]}=${a["value"]}`
          }
        },
        "header": (http) => {
          if (typeof a !== "object" && a["in"] === undefined) {
            return
          }
          if (http["headers"] === undefined) {
            http["headers"] = {}
          }
          http["headers"][a["key"]] = a["value"]
          return http
        }
      }
    },
    copyToClipboard(target) {
      const el = document.createElement('textarea');
      el.value = target;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
      }
      this.message = 'copyed!'
      setTimeout(() => {
        this.message = ''
      }, 500)
    },
  }
}
</script>
