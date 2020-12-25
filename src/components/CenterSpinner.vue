<template>
  <div class="loading">
    <b-spinner style="width: 10rem; height: 10rem"></b-spinner>
  </div>
</template>

<style scoped>
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -5rem;
  margin-left: -5rem;
}

.loading .spinner-border {
  border-width: 1rem;
}
</style>
