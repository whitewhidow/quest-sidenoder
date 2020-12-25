<template>
  <b-card
    no-body
    :img-src="item.imagePath"
    :img-alt="item.simpleName"
    img-top
    tag="article"
  >
    <div class="ribbon" v-if="item.mp">MP</div>
    <b-card-body>
      <b-link
        :href="item.infoLink"
        target="_blank"
        class="text-body"
        :disabled="!item.infoLink"
        ><h5 :title="item.simpleName">
          <b-spinner small v-if="loading"></b-spinner> {{ item.simpleName }}
        </h5></b-link
      >
      <b-card-text>
        <b-button
          class="card-link"
          href="#"
          variant="success"
          v-on:click="open(item)"
          v-if="
            item.installedVersion != -1 &&
            item.installedVersion < item.versionCode
          "
          :disabled="loading"
        >
          Update</b-button
        >
        <b-button
          class="card-link"
          href="#"
          variant="default"
          v-on:click="open(item)"
          v-if="item.installedVersion != -1"
          :disabled="loading"
        >
          Re-Install</b-button
        >
        <b-button
          class="card-link"
          href="#"
          variant="primary"
          v-on:click="open(item)"
          v-if="item.installedVersion == -1"
          :disabled="loading"
        >
          Install</b-button
        >
        <b-button
          class="card-link"
          href="#"
          variant="warning"
          v-on:click="uninstall(item)"
          v-if="item.installedVersion != -1"
          :disabled="loading"
        >
          Uninstall</b-button
        >
      </b-card-text>
    </b-card-body>

    <template #footer>
      <small class="d-flex"
        ><div class="flex-fill">
          {{ item.versionName || item.versionCode }}
        </div>
        <div>
          <b-icon icon="clock"></b-icon>
          {{ item.createdAt.toLocaleDateString() }}
        </div></small
      >
    </template>
  </b-card>
</template>

<script>
const { ipcRenderer } = require("electron");
const { formatBytes } = require("@/utils/formatter");

export default {
  name: "Game",
  props: {
    item: Object,
  },
  data: () => {
    return {
      loading: false,
    };
  },
  methods: {
    open: function (item) {
      ipcRenderer.once("check_folder", (e, args) => {
        this.loading = false;

        if (args.success) {
          let message =
            "Download " +
            formatBytes(args.value.totalSize) +
            " and install " +
            args.value.apk.Name +
            "?";

          if (args.value.hasObb) {
            message += " Obb files will be downloaded!";
          }

          this.$bvModal
            .msgBoxConfirm(message, {
              title: "Install " + args.value.apk.Name + "?",
              size: "lg",
              buttonSize: "lg",
              okVariant: "primary",
              centered: true,
            })
            .then((value) => {
              if (value) {
                this.$bvModal.show("bv-modal-sideload");
                ipcRenderer.send("sideload_folder", {
                  data: args.value,
                  app: this.item,
                });
              }
            });
        }
      });
      this.loading = true;
      ipcRenderer.send("check_folder", { path: item.filePath });
    },
    uninstall: function (item) {
      this.$bvModal
        .msgBoxConfirm("Uninstall " + item.simpleName + "?", {
          title: "Uninstall " + item.simpleName + "?",
          size: "lg",
          buttonSize: "lg",
          okVariant: "danger",
          centered: true,
        })
        .then((value) => {
          if (value) {
            this.$bvModal.show("bv-modal-sideload");
            ipcRenderer.send("uninstall_app", {
              packageName: this.item.packageName,
            });
          }
        });
    },
  },
};
</script>

<style scoped lang="scss">
@import "@/style/main.scss";
.card {
  overflow: hidden;
  height: 100%;
}
.card-body {
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;

  h5 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a.disabled {
    cursor: default;
    text-decoration: none;

    :hover {
      text-decoration: none;
    }
  }
}

.card-img-top {
  width: 100%;
  height: 46.74%;
  object-fit: cover;
}

.card-title {
  margin-bottom: 0.25rem;
}
.card-link + .card-link {
  margin-left: 0.5rem;
}
.card-text {
  margin-bottom: 0.5rem;
}

.card-footer {
  padding: 0.5rem;
  white-space: nowrap;
}

.ribbon {
  height: 40px;
  background: color("indigo");
  width: 200px;
  text-align: center;
  font-size: 1rem;
  line-height: 40px;
  font-family: sans-serif;
  color: #fff;
  transform: rotate(-45deg);
  position: absolute;
  top: 6px;
  left: -70px;
  box-shadow: inset 0px 0px 0px 4px rgba(255, 255, 255, 0.34);
}
</style>
