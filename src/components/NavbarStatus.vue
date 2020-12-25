<template>
  <b-card
    v-on:click="checkStatus()"
    class="text-center ml-2"
    :title="title"
    :bg-variant="status"
    text-variant="white"
  >
    <b-card-text>
      <b-spinner small v-if="loading"></b-spinner>
      {{ text }}
    </b-card-text>
  </b-card>
</template>

<script>
const { ipcRenderer } = require("electron");

export default {
  name: "NavbarStatus",
  props: {
    title: String,
    event: {
      type: String,
      required: true,
    },
  },
  data: function () {
    return {
      text: "",
      status: "default",
      loading: false,
      ipcRenderer,
    };
  },
  mounted: function () {
    this.$nextTick(function () {
      ipcRenderer.on(this.event, (e, args) => {
        this.loading = false;
        this.text = args.value;
        this.status = args.success ? "success" : "danger";
      });

      this.checkStatus();
    });
  },
  methods: {
    checkStatus: function () {
      this.status = "info";
      this.text = "Checking...";
      this.loading = true;
      setTimeout(() => ipcRenderer.send(this.event, null), 1000);
    },
  },
};
</script>

<style scoped>
.card {
  cursor: pointer;
}
.card-body,
.card-title {
  padding: 0 0.5rem;
  margin: 0;
}

.card-title {
  font-size: 1.1rem;
}
</style>
