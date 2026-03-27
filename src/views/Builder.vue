<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP BAR -->
    <div class="bg-white shadow p-3 flex gap-2 flex-wrap">
      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec)"
        class="bg-blue-500 text-white px-3 py-1 rounded"
      >
        + {{ sec.name }}
      </button>
    </div>

    <div class="flex flex-1">

      <!-- 🔹 CENTER -->
      <div class="flex-1 flex flex-col bg-gray-100 p-4">

        <!-- 🔹 PREVIEW -->
        <div class="bg-white rounded shadow p-4 flex-1 overflow-auto">

          <HeaderSection />

          <!-- 🔥 MAIN CONTAINER (ZONE BUILDER CLAIRE) -->
          <MainSection class="border-4 border-dashed border-blue-400 p-4 rounded-lg min-h-[300px]">

            <div
              v-for="section in filteredSections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(section.id)"
              @dragover.prevent
              @drop="drop(section.id)"
              @click="selectSection(section)"
              class="p-3 mb-3 rounded border cursor-move transition"
              :class="selectedSection?.id === section.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'"
            >

              <!-- 🔥 MODE ÉDITION VISUELLE FORCÉE -->
              <div v-if="selectedSection?.id === section.id" class="mb-3 bg-white p-2 border rounded">

                <div class="flex gap-2 mb-2 border-b pb-2">
                  <button @click="makeBold" class="px-2 border rounded">B</button>
                  <button @click="makeUppercase" class="px-2 border rounded">Aa</button>
                  <button @click="addEmoji" class="px-2 border rounded">😊</button>
                </div>

                <div
                  v-for="(val, key) in section.props"
                  :key="key"
                  class="mb-2"
                >
                  <label class="text-xs font-bold">{{ key }}</label>
                  <input
                    v-model="section.props[key]"
                    class="border p-2 w-full rounded"
                    @input="autoSave"
                  />
                </div>

              </div>

              <!-- 🔥 RENDER -->
              <component
                :is="safeGetComponent(section.type)"
                v-bind="section.props"
              />

            </div>

          </MainSection>

          <FooterSection />

        </div>

      </div>

      <!-- 🔹 RIGHT PANEL (ARBORESCENCE INTERACTIVE) -->
      <div class="w-80 bg-white border-l p-3">

        <h3 class="font-bold mb-2">📁 Arborescence</h3>

        <div class="space-y-1 text-sm">

          <div
            v-for="file in files"
            :key="file.name"
            @click="selectFile(file.name)"
            class="cursor-pointer p-2 rounded"
            :class="selectedFile === file.name ? 'bg-blue-100 font-bold' : ''"
          >
            📄 {{ file.name }}
          </div>

        </div>

        <!-- 🔥 CODE VIEW INTERACTIF -->
        <div class="mt-4 bg-black text-green-400 p-2 h-64 overflow-auto text-xs rounded">

          <div class="text-white mb-2">
            {{ selectedFile }}
          </div>

          <pre>{{ getFileContent(selectedFile) }}</pre>

        </div>

      </div>

    </div>
  </div>
</template>
