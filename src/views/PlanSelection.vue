<template>
  <div class="container">
    <h1>Choisir votre plan</h1>
    <button @click="selectPlan('free')">Gratuit - 30 jours</button>
    <button @click="selectPlan('paid')">Payant - 5$ / mois</button>
  </div>
</template>

<script>
export default {
  name: "PlanSelection",
  methods: {
    selectPlan(plan) {
      localStorage.setItem("selectedPlan", plan);
      this.$router.push("/register");
    },
  },
};
</script>
