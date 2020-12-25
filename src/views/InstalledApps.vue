<template>
  <div>
    <CenterSpinner v-if="loading" />
    <div class="installed" v-if="!loading">
      <h1>
        <b-icon icon="cpu" /> Installed apps
        <small class="text-muted" v-if="!loading"
          >{{ items.length }} apps</small
        >
      </h1>
      <div v-if="storage" class="mb-2">
        <div class="d-flex">
          <h6 class="py-2 pr-2">
            <b-icon icon="hdd" />
          </h6>
          <div class="flex-fill py-2">
            <b-progress
              :max="storage.total"
              :value="storage.used"
              variant="dark"
              height="1.125rem"
            >
              <b-progress-bar
                :value="storage.used"
                :label="`${storage.percentUsed} %`"
              ></b-progress-bar>
            </b-progress>
          </div>
          <h6 class="py-2 pl-2">
            {{ storage.free | formatBytes }} /
            {{ storage.total | formatBytes }} free
          </h6>
        </div>
      </div>

      <b-table striped hover :fields="fields" :items="items">
        <template #cell(version)="data">
          v{{ data.item.versionName }} ({{ data.item.versionCode }})
        </template>
        <template #cell(flags)="data">
          {{ data.item.debug ? "DEBUG" : "" }}
          {{ data.item.system ? "SYSTEM" : "" }}
        </template>
        <template #cell(actions)="data">
          <b-button size="sm" variant="danger" @click="uninstall(data.item)"
            >Uninstall</b-button
          >
        </template>
      </b-table>
      <SideloadModal />
    </div>
  </div>
</template>

<script>
const { ipcRenderer } = require("electron");
const { sortBy } = require("../utils/sort");

export default {
  name: "InstalledApps",
  data: function () {
    return {
      loading: false,
      fields: [
        { key: "label", label: "Name" },
        { key: "version", label: "Version" },
        { key: "packageName", label: "Packagename" },
        { key: "flags", label: "Flags" },
        { key: "actions", label: "" },
      ],
      items: [],
      storage: null,
    };
  },
  mounted: function () {
    this.$nextTick(function () {
      ipcRenderer.on("sideload_folder_progress", (e, args) => {
        // Update list if sideload is args.done: true
        if (args.done && args.task === "uninstall") {
          this.items = this.items.filter(
            (x) => x.packageName !== args.packageName
          );
        }
      });

      ipcRenderer.on("get_installed_apps", (e, args) => {
        this.items = sortBy(Object.values(args.value), "label", true);
        this.loading = false;
      });
      this.loading = true;
      ipcRenderer.send("get_installed_apps", null);

      ipcRenderer.on("get_storage_details", (e, args) => {
        if (args.success) {
          this.storage = args.value;
        }
      });
      this.loading = true;
      ipcRenderer.send("get_storage_details", null);
    });
  },
  methods: {
    uninstall: function (item) {
      this.$bvModal
        .msgBoxConfirm("Uninstall " + item.packageName + "?", {
          title: "Uninstall " + item.packageName + "?",
          size: "lg",
          buttonSize: "lg",
          okVariant: "danger",
          centered: true,
        })
        .then((value) => {
          if (value) {
            this.$bvModal.show("bv-modal-sideload");
            ipcRenderer.send("uninstall_app", {
              packageName: item.packageName,
            });
          }
        });
    },
  },
};
</script>

<style scoped>
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -5rem;
  margin-left: -5rem;
}
</style>
