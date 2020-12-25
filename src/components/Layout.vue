<template>
  <div>
    <Navbar />
    <b-container fluid><router-view></router-view></b-container>
  </div>
</template>

<script>
export default {
  name: "Layout",
  props: {
    msg: String,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
