<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP BAR (SECTIONS EN HAUT) -->
    <div class="bg-white shadow p-3 flex flex-wrap gap-2">
      <button
        v-for="sec in availableSections"
        :key="sec"
        @click="addSection(sec)"
        class="bg-blue-500 text-white px-3 py-1 rounded"
      >
        + {{ sec }}
      </button>
    </div>

    <div class="flex flex-1">

      <!-- 🔹 MAIN AREA -->
      <div class="flex-1 flex flex-col bg-gray-100 p-4">

        <!-- 🔹 PREVIEW -->
        <div class="bg-white rounded shadow p-4 flex-1 overflow-auto">

          <!-- HEADER -->
          <HeaderSection>
            <LogoSection />
          </HeaderSection>

          <!-- MAIN -->
          <MainSection>

            <!-- 🔥 SECTIONS DYNAMIQUES -->
            <div
              v-for="(section, index) in sections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(index)"
              @dragover.prevent
              @drop="drop(index)"
              @click="selectSection(section)"
              class="border mb-3 p-3 rounded cursor-move hover:bg-gray-50 transition"
              :class="selectedSection?.id === section.id ? 'border-blue-500' : ''"
            >
              <component
                :is="getComponent(section.type)"
                v-bind="section.props"
              />
            </div>

          </MainSection>

          <!-- FOOTER -->
          <FooterSection />

        </div>

        <!-- 🔹 EDITOR -->
        <div v-if="selectedSection" class="bg-white p-4 mt-4 rounded shadow">

          <!-- TOOLBAR -->
          <div class="flex gap-2 mb-3 border-b pb-2">
            <button @click="makeBold" class="tool">B</button>
            <button @click="makeUppercase" class="tool">Aa</button>
            <button @click="addEmoji" class="tool">😊</button>
          </div>

          <!-- INPUTS -->
          <div v-for="(val, key) in selectedSection.props" :key="key">
            <label class="text-sm font-medium">{{ key }}</label>
            <input
              v-model="selectedSection.props[key]"
              class="input"
              @input="autoSave"
              @blur="closeEditor"
              @keyup.enter="closeEditor"
            />
          </div>

        </div>

      </div>

      <!-- 🔹 FILE TREE (DROITE) -->
      <div class="w-72 bg-white border-l p-4">

        <h3 class="font-bold mb-3">📁 Fichiers</h3>

        <ul class="space-y-1 text-sm">

          <li @click="selectFile('index.html')" :class="fileClass('index.html')">index.html</li>
          <li @click="selectFile('App.vue')" :class="fileClass('App.vue')">App.vue</li>
          <li @click="selectFile('main.js')" :class="fileClass('main.js')">main.js</li>

          <li class="mt-2 font-semibold">Sections</li>

          <li
            v-for="(sec, i) in sections"
            :key="sec.id"
            @click="selectFile(sec.type + i)"
            :class="fileClass(sec.type + i)"
          >
            {{ sec.type }}{{ i + 1 }}.vue
          </li>

        </ul>

        <!-- 🔴 DELETE -->
        <button
          v-if="selectedSectionFromFile"
          @click="deleteFromTree"
          class="w-full bg-red-500 text-white mt-4 py-2 rounded hover:bg-red-600"
        >
          Supprimer section
        </button>

      </div>

    </div>

    <!-- 🔹 CODE VIEW -->
    <div class="bg-black text-green-400 p-4 h-52 overflow-auto text-xs
