<template>
  <div class="policy-container">
    <h2>Policy</h2>
    <p>Cancellations can only be made until one day before the booked time.</p>
    <p>
      The assistant can cancel your booked time, in that case, the assistant
      will inform you by mail.
    </p>
  </div>
</template>

<script>
export default {
  name: "PolicyView",
};
</script>

<style scoped>
.policy-container {
  background-color: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  max-width: 700px;
  margin: 0 auto;
}
</style>
