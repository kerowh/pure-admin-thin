<script setup lang="ts">
import { isNumber } from "@/utils/is";
import { computed } from "vue";
const props = defineProps({
  color: { type: String, default: "#0158F0" },
  size: {
    type: [Number, String],
    default: 16,
    validator: (v: any) =>
      isNumber(v) || (typeof v === "string" && /^\d+(px|rem|em|%)$/.test(v))
  }
});

const normalizedSize = computed(
  () =>
    isNumber(props.size)
      ? `${props.size}px`
      : props.size.replace(/(\d+)/, "$1px") /* 自动补全单位 */
);
</script>

<template>
  <div
    class="loader"
    :style="{
      '--loader-size': normalizedSize,
      '--loader-color': props.color
    }"
  />
</template>

<style scoped>
.loader {
  box-sizing: border-box;
  width: var(--loader-size);
  height: var(--loader-size);
  border-top: calc(var(--loader-size) * 0.1) solid var(--loader-color);
  border-right: calc(var(--loader-size) * 0.1) solid transparent;
  border-left: calc(var(--loader-size) * 0.1) solid var(--loader-color);
  border-radius: 50%;
  animation: loader 0.7s infinite linear;
}

@keyframes loader {
  to {
    transform: rotate(360deg);
  }
}
</style>
