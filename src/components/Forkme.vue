<template>
  <span id="forkongithub"><a href="https://github.com/dreampuf/postman_to_blackbox_exporter" target="_blank">Fork me on GitHub</a></span>
</template>

<script>
export default {
  name: "Forkme"
}
</script>

<style scoped>
#forkongithub a {
  background: #111;
  color: #fff;
  text-decoration: none;
  font-family: arial, sans-serif;
  text-align: center;
  font-weight: bold;
  padding: 5px 40px;
  font-size: 1rem;
  line-height: 2rem;
  position: relative;
  transition: 0.5s;
}

#forkongithub a:hover {
  background: #c11;
  color: #fff;
}

#forkongithub a::before, #forkongithub a::after {
  content: "";
  width: 100%;
  display: block;
  position: absolute;
  top: 1px;
  left: 0;
  height: 1px;
  background: #fff;
}

#forkongithub a::after {
  bottom: 1px;
  top: auto;
}

@media screen and (min-width: 800px) {
  #forkongithub {
    position: absolute;
    display: block;
    top: 0;
    right: 0;
    width: 350px;
    overflow: hidden;
    height: 350px;
    z-index: 9999;
  }

  #forkongithub a {
    width: 350px;
    position: absolute;
    top: 70px;
    right: -70px;
    transform: rotate(45deg);
    -webkit-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    -o-transform: rotate(45deg);
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.8);
  }
}

</style>