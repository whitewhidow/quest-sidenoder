<template>
  <div>
    <CenterSpinner v-if="loading" />
    <div class="browse" v-if="!loading">
      <div class="d-flex">
        <div class="flex-fill">
          <h1>
            <b-icon icon="journal-text" /> Browse
            <small class="text-muted" v-if="!loading"
              >{{ filteredItems.length }} games</small
            >
          </h1>
        </div>
        <div>
          <b-button variant="outline-light" @click="reload()"
            ><b-icon icon="arrow-repeat" /> Refresh</b-button
          >
        </div>
      </div>
      <b-input-group class="mt-2 mb-4">
        <b-input-group-prepend>
          <b-input-group-text class="border-0">
            <b-icon icon="search" />
          </b-input-group-text>
        </b-input-group-prepend>

        <b-form-input
          placeholder="Search..."
          class="border-0"
          v-model="query"
          @keyup.enter="updateList()"
        ></b-form-input>

        <b-input-group-append>
          <b-button
            :disabled="query == ''"
            @click="
              query = '';
              updateList();
            "
            ><b-icon icon="x-circle" /> Clear</b-button
          >
          <b-dropdown right>
            <template #button-content
              ><b-icon
                icon="funnel"
                :variant="filter !== filterDefault ? 'warning' : 'default'"
              />
              Filter</template
            >
            <b-dropdown-form>
              <b-form-checkbox-group
                v-model="filter"
                :options="filterOptions"
                stacked
              ></b-form-checkbox-group>
              <b-button
                block
                size="sm"
                class="mt-2"
                @click="filter = filterDefault"
                >Reset</b-button
              >
            </b-dropdown-form>
          </b-dropdown>
          <b-dropdown right>
            <template #button-content
              ><b-icon icon="filter" /> {{ sortName }}</template
            >
            <b-dropdown-item-button
              v-for="o in sortOptions"
              :key="o.text"
              :active="sort.key == o.value.key && sort.asc == o.value.asc"
              @click="
                sortName = o.text;
                sort = o.value;
              "
              >{{ o.text }}</b-dropdown-item-button
            >
          </b-dropdown>
        </b-input-group-append>
      </b-input-group>

      <h2 v-if="error">{{ error }}</h2>

      <b-row class="mx-0">
        <template v-for="item in filteredItems">
          <div
            v-bind:key="item.name"
            class="px-1 mb-2 col-12 col-md-4 col-lg-3 col-xl-2"
            v-bind:class="{
              'tag-installed': item.installedVersion != -1,
              'tag-update':
                item.installedVersion != -1 &&
                item.installedVersion < item.versionCode,
            }"
          >
            <Game :item="item" class="p-0" />
          </div>
        </template>
      </b-row>
    </div>
    <SideloadModal />
  </div>
</template>

<script>
const { ipcRenderer } = require("electron");
const { sortBy } = require("../utils/sort");

export default {
  name: "Browse",
  data: function () {
    return {
      items: [],
      filteredItems: [],
      loading: false,
      query: "",
      filterDefault: ["uninstalled", "installed", "update"],
      filter: null,
      filterOptions: [
        { text: "Show not-installed", value: "uninstalled" },
        { text: "Show installed", value: "installed" },
        { text: "Show updates", value: "update" },
      ],
      sort: null,
      sortName: null,
      sortOptions: [
        { text: "Sort by name ↓", value: { key: "name", asc: true } },
        { text: "Sort by name ↑", value: { key: "name", asc: false } },
        { text: "Sort by update ↓", value: { key: "createdAt", asc: true } },
        { text: "Sort by update ↑", value: { key: "createdAt", asc: false } },
      ],
      error: null,
    };
  },
  beforeMount: function () {
    // Apply from setting
    const sortSettingJson = localStorage.getItem("browse-sort");
    if (sortSettingJson) {
      const sortSetting = JSON.parse(sortSettingJson);
      const selected = this.sortOptions.filter(
        (x) =>
          x.value.key === sortSetting.key && x.value.asc === sortSetting.asc
      );
      if (selected && selected.length > 0) {
        this.sort = selected[0].value;
        this.sortName = selected[0].text;
      }
    }

    // Apply default if nothing is set
    if (this.sort === null) {
      this.sort = this.sortOptions[0].value;
      this.sortName = this.sortOptions[0].text;
    }

    if (this.filter === null) {
      this.filter = this.filterDefault;
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      ipcRenderer.on("ls_dir", (e, args) => {
        if (args.success) {
          this.error = null;
          this.items = args.value;
          this.updateList();
          this.loading = false;
        } else {
          this.error = args.error;
        }
      });

      this.loading = true;
      ipcRenderer.on("check_mount", this.onMountUpdate);
      ipcRenderer.send("check_mount", null);

      ipcRenderer.on("sideload_folder_progress", (e, args) => {
        if (args.done && args.success) {
          if (args.task == "install") {
            this.items
              .filter((x) => x.packageName == args.packageName)
              .forEach((item) => {
                console.log(item.packageName, "was installed");
                item.installedVersion = item.versionCode;
              });
            this.updateList();
          } else if (args.task == "uninstall") {
            this.items
              .filter((x) => x.packageName == args.packageName)
              .forEach((item) => {
                console.log(item.packageName, "was uninstalled");
                item.installedVersion = -1;
              });
            this.updateList();
          }
        }
      });

      ipcRenderer.on("browse_better_image_ready", (e, args) => {
        console.log("browse_better_image_ready", args.infoLink);
        this.items
          .filter((x) => x.infoLink == args.infoLink)
          .forEach((item) => {
            item.imagePath = args.imageUrl;
          });
        this.updateList();
      });
    });
  },
  watch: {
    filter: function () {
      localStorage.setItem("browse-filter", JSON.stringify(this.filter));
      this.updateList();
    },
    sort: function () {
      localStorage.setItem("browse-sort", JSON.stringify(this.sort));
      this.updateList();
    },
  },
  methods: {
    onMountUpdate(e, args) {
      if (args.success) {
        ipcRenderer.removeListener("check_mount", this.onMountUpdate);
        this.reload();
      }
    },
    reload() {
      this.loading = true;
      ipcRenderer.send("ls_dir", { path: "/" });
    },
    updateList() {
      this.filteredItems = [];
      const newList = [];
      for (const item of this.items) {
        const isInstalled = item.installedVersion != -1;
        const hasUpdate =
          isInstalled && item.installedVersion < item.versionCode;

        let candiate = null;

        if (!isInstalled && this.filter.includes("uninstalled")) {
          candiate = item;
        } else if (isInstalled && this.filter.includes("installed")) {
          candiate = item;
        } else if (hasUpdate && this.filter.includes("update")) {
          candiate = item;
        }

        if (
          candiate &&
          this.query != "" &&
          !candiate.simpleName.toLowerCase().includes(this.query.toLowerCase())
        ) {
          candiate = null;
        }

        if (candiate != null) {
          newList.push(candiate);
        }
      }

      // Sort list
      this.filteredItems = sortBy(newList, this.sort.key, this.sort.asc);
    },
  },
};
</script>

<style>
.item {
  padding: 0;
}
.custom-control-label {
  white-space: nowrap;
}
</style>
