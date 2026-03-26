<template>
  <div class="min-h-screen bg-gray-100 flex flex-col md:flex-row">

    <!-- 🔹 SIDEBAR -->
    <div class="w-full md:w-1/4 bg-white p-4 shadow">

      <h2 class="font-bold mb-4">Sections</h2>

      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec.type)"
        class="w-full mb-2 p-2 bg-blue-500 text-white rounded"
      >
        + {{ sec.name }}
      </button>

    </div>

    <!-- 🔹 PREVIEW -->
    <div class="flex-1 p-6">

      <h2 class="font-bold mb-4">Aperçu</h2>

      <div class="bg-white p-4 shadow min-h-[300px]">

        <!-- 🔥 SAFE LOOP -->
        <template v-if="safeSections.length">

          <div
            v-for="sec in safeSections"
            :key="sec.id"
            class="border-b p-2"
            @click="selectSection(sec)"
          >

            <!-- 🔥 SAFE COMPONENT -->
            <component
              v-if="getComponent(sec.type)"
              :is="getComponent(sec.type)"
              v-bind="sec.props"
            />

            <!-- fallback -->
            <div v-else class="text-red-500">
              ⚠ Section inconnue : {{ sec.type }}
            </div>

          </div>

        </template>

        <div v-else class="text-gray-400 text-center py-10">
          Aucune section
        </div>

      </div>

      <!-- 🔹 EDITOR -->
      <div v-if="selectedSection" class="mt-4 p-4 bg-white shadow">

        <h3 class="font-bold mb-2">Editor</h3>

        <div
          v-for="(val, key) in selectedSection.props"
          :key="key"
          class="mb-2"
        >
          <label class="text-sm text-gray-500">{{ key }}</label>

          <input
            v-model="selectedSection.props[key]"
            class="border p-2 w-full"
            @input="autoSave"
          />
        </div>

      </div>

    </div>

  </div>
</template>
