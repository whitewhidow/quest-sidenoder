<template>
  <b-modal
    id="bv-modal-sideload"
    no-close-on-esc
    no-close-on-backdrop
    hide-header-close
    @shown="onShown()"
  >
    <template #modal-title>{{ title }}</template>

    <b-alert show variant="danger" v-if="completed && !success">
      <h5 class="alert-heading">Error!</h5>
      <p class="mb-0">{{ error }}</p>
    </b-alert>

    <div class="d-block">
      <b-list-group>
        <b-list-group-item
          v-for="item in items"
          v-show="item.show"
          :key="item.key"
          :variant="getStatusClass(item)"
        >
          <b-spinner small :class="{ invisible: !item.loading }"></b-spinner>
          {{ item.text }}</b-list-group-item
        >
      </b-list-group>
    </div>
    <template #modal-footer="{ close }">
      <div class="w-100">
        <b-button
          v-if="completed"
          variant="primary"
          size="sm"
          class="float-right"
          @click="close()"
        >
          Close
        </b-button>
      </div>
    </template>
  </b-modal>
</template>

<script>
const { ipcRenderer } = require("electron");

export default {
  name: "SideloadModal",
  data: function () {
    return {
      title: "Working...",
      completed: false,
      hasReceivedUpdate: false,
      success: false,
      error: null,
      items: [],
    };
  },
  methods: {
    onShown() {
      // If we fail on the first step, it is possible that @shown is called
      // after we already set completed to true. So we have to check if we
      // already got an event before setting it here
      if (!this.hasReceivedUpdate) {
        this.completed = false;
      }
    },
    getStatusClass(item) {
      if (!item.started) {
        return "default";
      } else {
        if (item.loading) {
          return "info";
        } else {
          if (item.status) {
            return "success";
          } else {
            return "danger";
          }
        }
      }
    },
  },
  created() {
    this.hasReceivedUpdate = false;
    ipcRenderer.on("sideload_folder_progress", (e, args) => {
      this.hasReceivedUpdate = true;
      this.items = args.items;
      if (args.done) {
        this.completed = true;
        this.title = "Done";
        this.success = args.success;
        if (this.success) {
          this.title = "Success";
        } else {
          this.title = "Error";
          this.error = args.error;
        }
      }
    });
  },
};
</script>

<style scoped></style>
