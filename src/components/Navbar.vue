<template>
  <nav>
    <b-navbar toggleable="lg" type="dark" variant="dark">
      <b-navbar-brand :to="{ path: '/' }">QSL</b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <b-nav-item
            v-for="item of navItems"
            :key="item.name"
            :to="{ path: item.path }"
            exact
            ><b-icon v-if="item.icon" :icon="item.icon" />
            {{ item.name }}</b-nav-item
          >
        </b-navbar-nav>

        <!-- Right aligned nav items -->
        <b-navbar-nav class="ml-auto">
          <NavbarStatus title="Drive status" event="check_mount" />
          <NavbarStatus title="Device status" event="check_device" />
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
  </nav>
</template>

<script>
import { routes } from "../router";

export default {
  name: "Navbar",
  data: () => {
    return {
      navItems: routes.filter((x) => x.showInNav),
    };
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
nav {
  margin-bottom: 2rem;
}
</style>
