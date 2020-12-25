<template>
  <div>
    <h2>
      System check - <span v-if="!completed">Running...</span>
      <span v-if="completed && success">Successful!</span>
      <span v-if="completed && !success">Failed!</span>
    </h2>
    <b-list-group>
      <b-list-group-item
        v-for="item in items"
        :key="item.key"
        :variant="item.loading ? 'default' : item.status ? 'success' : 'danger'"
      >
        <b-spinner small :class="{ invisible: !item.loading }"></b-spinner>
        {{ item.text }}
        <b-button
          class="float-right"
          v-if="!item.loading && !item.status && item.click"
          @click="$refs[item.click].click()"
          >Select {{ item.click }}</b-button
        >
      </b-list-group-item>
    </b-list-group>

    <input
      type="file"
      ref="adb"
      style="display: none"
      @change="onAdbSelected($event)"
    />

    <input
      type="file"
      ref="rclone"
      style="display: none"
      @change="onRcloneSelected($event)"
    />
  </div>
</template>

<script>
const { ipcRenderer } = require("electron");

export default {
  name: "Loading",
  data: function () {
    return {
      completed: false,
      success: false,
      items: [
        {
          key: "platform",
          text: "Checking platform",
          loading: true,
          status: false,
        },
        {
          key: "work_dir",
          text: "Finding work dir",
          loading: true,
          status: true,
        },
        {
          key: "adb",
          text: "Checking ADB",
          loading: true,
          status: false,
          click: "adb",
        },
        {
          key: "rclone",
          text: "Checking rclone",
          loading: true,
          status: false,
          click: "rclone",
        },
      ],
    };
  },
  mounted: function () {
    this.$nextTick(function () {
      this.runCheck();
    });
  },
  methods: {
    runCheck() {
      for (const item of this.items) {
        ipcRenderer.once("check_deps_" + item.key, (e, args) => {
          const tmp = this.items.filter((x) => x.key === item.key)[0];
          tmp.status = args.status;
          tmp.text = args.value;
          tmp.loading = false;

          this.checkStatus();
        });
        ipcRenderer.send("check_deps_" + item.key, null);
      }
    },
    checkStatus() {
      let allDone = true;
      let allSuccess = true;
      for (const item of this.items) {
        if (item.loading) {
          allDone = false;
        } else if (!item.loading && !item.status) {
          allSuccess = false;
        }
      }

      this.completed = allDone;
      this.success = allSuccess;

      if (this.completed && this.success) {
        setTimeout(() => {
          this.$router.push({ path: "browse" });
        }, 1000);
      }
    },
    onAdbSelected($event) {
      const path = $event.target.files[0].path;

      ipcRenderer.once("put_setting", () => {
        this.runCheck();
      });
      ipcRenderer.send("put_setting", {
        key: "adb.executable",
        value: path,
      });
    },
    onRcloneSelected($event) {
      const path = $event.target.files[0].path;

      ipcRenderer.once("put_setting", () => {
        this.runCheck();
      });
      ipcRenderer.send("put_setting", {
        key: "rclone.executable",
        value: path,
      });
    },
  },
};
</script>
