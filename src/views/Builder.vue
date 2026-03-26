<template>
  <div class="min-h-screen bg-gray-100 flex flex-col md:flex-row">

    <!-- 🔹 Sidebar -->
    <div class="w-full md:w-1/4 bg-white p-4 shadow-md">
      <h2 class="text-xl font-bold mb-4">Sections</h2>

      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec.type)"
        class="w-full mb-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        + {{ sec.name }}
      </button>

      <button
        @click="cleanSections"
        class="w-full mt-4 p-2 bg-red-500 text-white rounded"
      >
        🧹 Clean sections
      </button>
    </div>

    <!-- 🔹 Preview -->
    <div class="flex-1 p-6">

      <h2 class="text-xl font-bold mb-4">Aperçu</h2>

      <div class="bg-white shadow rounded p-4 min-h-[400px]">

        <div
          v-if="state.sections.length === 0"
          class="text-gray-400 text-center py-10"
        >
          Aucune section
        </div>

        <div
          v-for="sec in state.sections"
          :key="sec.id"
          @click="selectSection(sec)"
          class="cursor-pointer border-b"
        >
          <component
            :is="sectionRegistry[sec.type]"
            v-bind="sec.props"
          />
        </div>

      </div>

      <!-- 🔹 Editor -->
      <div v-if="selectedSection" class="mt-6 bg-white p-4 shadow rounded">

        <h3 class="font-bold mb-2">Editor</h3>

        <div
          v-for="(val, key) in selectedSection.props"
          :key="key"
          class="mb-2"
        >
          <label class="text-sm text-gray-500">{{ key }}</label>

          <input
            v-model="selectedSection.props[key]"
            class="border p-2 w-full rounded"
            @input="autoSave"
          />
        </div>

      </div>

    </div>

  </div>
</template>
