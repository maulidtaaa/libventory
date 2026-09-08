/* ============================================================
   LIBVENTORY
   Enhanced Inventory System
============================================================ */

const STORAGE_KEY = "libventory_inventory_v4";
const OLD_STORAGE_KEY = "libventory_inventory_v3";
const VERY_OLD_STORAGE_KEY = "librastock_inventory_v2";

const THEME_KEY = "libventory_theme_v4";
const OLD_THEME_KEY = "libventory_theme_v3";

const LOCAL_BACKUP_KEY = "libventory_local_backup_v1";

let inventory = [];
let editingId = null;
let selectedDetailId = null;
let deferredInstallPrompt = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];


/* ============================================================
   START
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  startSplash();

  loadData();

  bindEvents();

  applySavedTheme();

  renderAll();

  updateNetworkStatus();

  registerServiceWorker();

  updateLocalBackupStatus();

});


/* ============================================================
   SPLASH
============================================================ */

function startSplash() {

  setTimeout(() => {

    const splash = $("#splashScreen");

    if (splash) {
      splash.classList.add("hidden");
    }

    $("#app")?.classList.remove("hidden");

  }, 1800);

}


/* ============================================================
   EVENTS
============================================================ */

function bindEvents() {

  $("#inventoryForm")
    ?.addEventListener("submit", saveInventory);


  $("#cancelEditBtn")
    ?.addEventListener("click", closeForm);


  $("#cancelEditBtnBottom")
    ?.addEventListener("click", closeForm);


  $("#openFormBtn")
    ?.addEventListener("click", openForm);


  $("#inventoryTopAddBtn")
    ?.addEventListener("click", openForm);


  $("#emptyAddBtn")
    ?.addEventListener("click", openForm);


  $("#searchInput")
    ?.addEventListener("input", renderTable);


  $("#roomFilter")
    ?.addEventListener("change", renderTable);


  $("#categoryFilter")
    ?.addEventListener("change", renderTable);


  $("#conditionFilter")
    ?.addEventListener("change", renderTable);


  $("#sortFilter")
    ?.addEventListener("change", renderTable);


  $("#resetFilterBtn")
    ?.addEventListener("click", resetFilters);


  $("#backupBtn")
    ?.addEventListener("click", exportData);


  $("#importBtn")
    ?.addEventListener("click", () => {
      $("#importFile")?.click();
    });


  $("#importFile")
    ?.addEventListener("change", importData);


  $("#createLocalBackupBtn")
    ?.addEventListener("click", createLocalBackup);


  $("#restoreLocalBackupBtn")
    ?.addEventListener("click", restoreLocalBackup);


  $("#clearBtn")
    ?.addEventListener("click", clearData);


  $("#themeBtn")
    ?.addEventListener("click", toggleTheme);


  $("#sideThemeBtn")
    ?.addEventListener("click", toggleTheme);


  $("#mobileMenuBtn")
    ?.addEventListener("click", () => {

      $("#sidebar")?.classList.toggle("open");

    });


  $("#detailEditBtn")
    ?.addEventListener("click", editFromModal);


  $("#detailDeleteBtn")
    ?.addEventListener("click", deleteFromModal);


  $$("[data-close-modal]")
    .forEach(element => {

      element.addEventListener(
        "click",
        closeModal
      );

    });


  $$(".nav-item[data-section]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showSection(
            button.dataset.section
          );

        }
      );

    });


  $$("[data-section-target]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showSection(
            button.dataset.sectionTarget
          );

          if (
            button.dataset.openForm === "true"
          ) {

            openForm();

          }

        }
      );

    });


  $("#unitPrice")
    ?.addEventListener(
      "input",
      updateFormTotal
    );


  $("#quantity")
    ?.addEventListener(
      "input",
      updateFormTotal
    );


  window.addEventListener(
    "beforeinstallprompt",
    event => {

      event.preventDefault();

      deferredInstallPrompt = event;

      $("#installBtn")
        ?.classList
        .remove("hidden");

    }
  );


  $("#installBtn")
    ?.addEventListener(
      "click",
      installPWA
    );


  window.addEventListener(
    "appinstalled",
    () => {

      deferredInstallPrompt = null;

      $("#installBtn")
        ?.classList
        .add("hidden");

      showToast(
        "LIBVENTORY berhasil di-install."
      );

    }
  );


  window.addEventListener(
    "online",
    updateNetworkStatus
  );


  window.addEventListener(
    "offline",
    updateNetworkStatus
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeModal();

      }

    }
  );

}


/* ============================================================
   NAVIGATION
============================================================ */

function showSection(id) {

  $$(".page-section")
    .forEach(section => {

      section.classList.remove(
        "active-section"
      );

    });


  const target = $("#" + id);

  if (target) {

    target.classList.add(
      "active-section"
    );

  }


  $$(".nav-item[data-section]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.section === id
      );

    });


  $("#sidebar")
    ?.classList
    .remove("open");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* ============================================================
   FORM
============================================================ */

function openForm() {

  $("#formPanel")
    ?.classList
    .remove("hidden");


  showSection(
    "inventorySection"
  );


  setTimeout(() => {

    $("#itemName")?.focus();

  }, 100);

}


function closeForm() {

  resetForm();

  $("#formPanel")
    ?.classList
    .add("hidden");

}


function resetForm() {

  editingId = null;

  $("#inventoryForm")?.reset();

  $("#roomName").value =
    "Perpustakaan";

  $("#formTitle").textContent =
    "Tambah Inventaris";

  $("#submitBtn").textContent =
    "Simpan Inventaris";

  $("#formTotalValue").textContent =
    formatRupiah(0);

}


/* ============================================================
   DATA LOADING
============================================================ */

function loadData() {

  try {

    let raw =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (!raw) {

      raw =
        localStorage.getItem(
          OLD_STORAGE_KEY
        );

    }


    if (!raw) {

      raw =
        localStorage.getItem(
          VERY_OLD_STORAGE_KEY
        );

    }


    if (!raw) {

      inventory = [];

      return;

    }


    const parsed =
      JSON.parse(raw);


    if (!Array.isArray(parsed)) {

      inventory = [];

      return;

    }


    inventory =
      parsed
        .map(normalizeItem)
        .filter(Boolean);


    saveData();

  } catch {

    inventory = [];

  }

}


function normalizeItem(item) {

  if (
    !item ||
    typeof item !== "object"
  ) {

    return null;

  }


  const quantity =
    Number(item.quantity);


  if (
    !item.name ||
    !item.code ||
    !item.room ||
    !Number.isFinite(quantity) ||
    quantity < 1
  ) {

    return null;

  }


  const validConditions = [
    "Baik",
    "Rusak Ringan",
    "Rusak Berat"
  ];


  const condition =
    validConditions.includes(
      item.condition
    )
      ? item.condition
      : "Baik";


  return {

    id:
      item.id ||
      createId(),

    name:
      String(item.name).trim(),

    code:
      String(item.code)
        .trim()
        .toUpperCase(),

    category:
      item.category ||
      "Lainnya",

    room:
      String(item.room).trim(),

    location:
      item.location
        ? String(item.location).trim()
        : "",

    quantity:
      Math.floor(quantity),

    condition,

    unitPrice:
      Math.max(
        0,
        Number(item.unitPrice) || 0
      ),

    purchaseDate:
      item.purchaseDate || "",

    responsible:
      item.responsible
        ? String(item.responsible).trim()
        : "",

    notes:
      item.notes
        ? String(item.notes).trim()
        : "",

    createdAt:
      Number(item.createdAt) ||
      Date.now(),

    updatedAt:
      Number(item.updatedAt) ||
      Number(item.createdAt) ||
      Date.now()

  };

}


function saveData() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(inventory)
  );

}


/* ============================================================
   FORM DATA
============================================================ */

function getFormData() {

  return {

    name:
      $("#itemName")
        .value
        .trim(),

    code:
      $("#inventoryCode")
        .value
        .trim()
        .toUpperCase(),

    category:
      $("#category")
        .value,

    room:
      $("#roomName")
        .value
        .trim(),

    location:
      $("#location")
        .value
        .trim(),

    quantity:
      Number(
        $("#quantity")
          .value
      ),

    condition:
      $("#condition")
        .value,

    unitPrice:
      Number(
        $("#unitPrice")
          .value
      ) || 0,

    purchaseDate:
      $("#purchaseDate")
        .value,

    responsible:
      $("#responsible")
        .value
        .trim(),

    notes:
      $("#itemNotes")
        .value
        .trim()

  };

}


/* ============================================================
   SAVE INVENTORY
============================================================ */

function saveInventory(event) {

  event.preventDefault();


  const data =
    getFormData();


  if (
    !data.name ||
    !data.code ||
    !data.category ||
    !data.room ||
    !Number.isFinite(
      data.quantity
    ) ||
    data.quantity < 1 ||
    !data.condition
  ) {

    showToast(
      "Lengkapi data wajib terlebih dahulu."
    );

    return;

  }


  if (
    !Number.isInteger(
      data.quantity
    )
  ) {

    showToast(
      "Jumlah barang harus berupa angka bulat."
    );

    return;

  }


  if (
    data.unitPrice < 0
  ) {

    showToast(
      "Harga satuan tidak boleh negatif."
    );

    return;

  }


  const duplicate =
    inventory.some(
      item =>
        item.code.toLowerCase() ===
        data.code.toLowerCase() &&
        item.id !== editingId
    );


  if (duplicate) {

    showToast(
      "Kode inventaris sudah digunakan."
    );

    return;

  }


  if (editingId) {

    const index =
      inventory.findIndex(
        item =>
          item.id === editingId
      );


    if (index !== -1) {

      inventory[index] = {

        ...inventory[index],

        ...data,

        updatedAt:
          Date.now()

      };

      showToast(
        "Data inventaris berhasil diperbarui."
      );

    }

  } else {

    inventory.unshift({

      id:
        createId(),

      ...data,

      createdAt:
        Date.now(),

      updatedAt:
        Date.now()

    });


    showToast(
      "Data inventaris berhasil ditambahkan."
    );

  }


  saveData();

  closeForm();

  renderAll();

}


/* ============================================================
   EDIT
============================================================ */

function editItem(id) {

  const item =
    inventory.find(
      row => row.id === id
    );


  if (!item) {
    return;
  }


  editingId = id;


  $("#itemName").value =
    item.name;

  $("#inventoryCode").value =
    item.code;

  $("#category").value =
    item.category;

  $("#roomName").value =
    item.room;

  $("#location").value =
    item.location;

  $("#quantity").value =
    item.quantity;

  $("#condition").value =
    item.condition;

  $("#unitPrice").value =
    item.unitPrice;

  $("#purchaseDate").value =
    item.purchaseDate;

  $("#responsible").value =
    item.responsible;

  $("#itemNotes").value =
    item.notes;


  $("#formTitle").textContent =
    "Edit Inventaris";

  $("#submitBtn").textContent =
    "Simpan Perubahan";


  updateFormTotal();

  showSection(
    "inventorySection"
  );

  $("#formPanel")
    .classList
    .remove("hidden");


  closeModal();

  setTimeout(() => {

    $("#itemName")?.focus();

  }, 100);

}


/* ============================================================
   DELETE
============================================================ */

function deleteItem(id) {

  const item =
    inventory.find(
      row => row.id === id
    );


  if (!item) {
    return;
  }


  if (
    !confirm(
      "Apakah Anda yakin ingin menghapus data ini?"
    )
  ) {

    return;

  }


  inventory =
    inventory.filter(
      row => row.id !== id
    );


  saveData();


  if (
    editingId === id
  ) {

    resetForm();

  }


  closeModal();

  renderAll();


  showToast(
    "Data inventaris berhasil dihapus."
  );

}


/* ============================================================
   FILTER
============================================================ */

function getFilteredItems() {

  const search =
    $("#searchInput")
      .value
      .trim()
      .toLowerCase();


  const room =
    $("#roomFilter")
      .value;


  const category =
    $("#categoryFilter")
      .value;


  const condition =
    $("#conditionFilter")
      .value;


  const sort =
    $("#sortFilter")
      .value;


  let result =
    inventory.filter(
      item => {

        const searchMatch =
          !search ||
          item.name
            .toLowerCase()
            .includes(search) ||
          item.code
            .toLowerCase()
            .includes(search);


        const roomMatch =
          room === "all" ||
          item.room === room;


        const categoryMatch =
          category === "all" ||
          item.category === category;


        const conditionMatch =
          condition === "all" ||
          item.condition === condition;


        return (
          searchMatch &&
          roomMatch &&
          categoryMatch &&
          conditionMatch
        );

      }
    );


  result.sort(
    (a, b) => {

      switch (sort) {

        case "oldest":

          return (
            a.createdAt -
            b.createdAt
          );


        case "name":

          return a.name.localeCompare(
            b.name,
            "id"
          );


        case "code":

          return a.code.localeCompare(
            b.code,
            "id"
          );


        case "quantity-high":

          return (
            b.quantity -
            a.quantity
          );


        case "value-high":

          return (
            getAssetValue(b) -
            getAssetValue(a)
          );


        case "newest":

        default:

          return (
            b.createdAt -
            a.createdAt
          );

      }

    }
  );


  return result;

}


/* ============================================================
   TABLE
============================================================ */

function renderTable() {

  const items =
    getFilteredItems();


  $("#inventoryBody").innerHTML =
    items
      .map(
        (item, index) => {

          const cls =
            item.condition === "Baik"
              ? "badge-good"
              : item.condition === "Rusak Ringan"
                ? "badge-minor"
                : "badge-major";


          return `

            <tr>

              <td>
                ${index + 1}
              </td>


              <td>
                <div class="item-title">
                  ${escapeHTML(item.name)}
                </div>
              </td>


              <td>
                <span class="item-code">
                  ${escapeHTML(item.code)}
                </span>
              </td>


              <td>
                ${escapeHTML(item.category)}
              </td>


              <td>
                ${escapeHTML(item.room)}
              </td>


              <td>
                ${escapeHTML(item.location || "-")}
              </td>


              <td>
                ${item.quantity} unit
              </td>


              <td>
                <span class="badge ${cls}">
                  ${escapeHTML(item.condition)}
                </span>
              </td>


              <td>
                ${formatRupiah(
                  getAssetValue(item)
                )}
              </td>


              <td>

                <div class="row-actions">

                  <button
                    class="action-btn"
                    onclick="viewItem('${item.id}')"
                  >
                    Detail
                  </button>

                  <button
                    class="action-btn"
                    onclick="editItem('${item.id}')"
                  >
                    Edit
                  </button>

                  <button
                    class="action-btn delete"
                    onclick="deleteItem('${item.id}')"
                  >
                    Hapus
                  </button>

                </div>

              </td>

            </tr>

          `;

        }
      )
      .join("");


  const empty =
    items.length === 0;


  $("#emptyState")
    .classList
    .toggle(
      "hidden",
      !empty
    );


  $("#inventoryTableWrap")
    .classList
    .toggle(
      "hidden",
      empty
    );


  $("#tableCount").textContent =
    `${items.length} data`;

}


/* ============================================================
   RECENT
============================================================ */

function renderRecent() {

  const recent =
    inventory
      .slice()
      .sort(
        (a, b) =>
          b.createdAt -
          a.createdAt
      )
      .slice(0, 5);


  if (!recent.length) {

    $("#recentItems").innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ▦
        </div>

        <h3>
          Belum ada inventaris
        </h3>

        <p>
          Tambahkan barang pertama dari menu Inventaris.
        </p>

      </div>

    `;

    return;

  }


  $("#recentItems").innerHTML =
    recent
      .map(
        item => `

          <button
            class="recent-item"
            onclick="viewItem('${item.id}')"
          >

            <div class="recent-main">

              <strong>
                ${escapeHTML(item.name)}
              </strong>

              <small>
                ${escapeHTML(item.code)}
                •
                ${escapeHTML(item.category)}
                •
                ${escapeHTML(item.room)}
              </small>

            </div>


            <span class="recent-qty">
              ${item.quantity} unit
            </span>

          </button>

        `
      )
      .join("");

}


/* ============================================================
   STATS
============================================================ */

function updateStats() {

  const total =
    inventory.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );


  const good =
    sumCondition("Baik");


  const minor =
    sumCondition("Rusak Ringan");


  const major =
    sumCondition("Rusak Berat");


  $("#totalItems").textContent =
    total;


  $("#goodItems").textContent =
    good;


  $("#minorItems").textContent =
    minor;


  $("#majorItems").textContent =
    major;


  const assetValue =
    inventory.reduce(
      (sum, item) =>
        sum + getAssetValue(item),
      0
    );


  $("#dashboardAssetValue").textContent =
    formatRupiah(assetValue);


  $("#statisticsAssetValue").textContent =
    formatRupiah(assetValue);


  $("#uniqueItemCount").textContent =
    inventory.length;


  $("#uniqueCategoryCount").textContent =
    new Set(
      inventory.map(
        item => item.category
      )
    ).size;

}


function sumCondition(condition) {

  return inventory
    .filter(
      item =>
        item.condition ===
        condition
    )
    .reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

}


/* ============================================================
   FILTER OPTIONS
============================================================ */

function updateRoomFilter() {

  const current =
    $("#roomFilter")
      .value;


  const rooms =
    [
      ...new Set(
        inventory
          .map(item => item.room)
          .filter(Boolean)
      )
    ]
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            "id"
          )
      );


  $("#roomFilter").innerHTML =

    `<option value="all">
      Semua Ruangan
    </option>` +

    rooms
      .map(
        room =>
          `<option value="${escapeHTML(room)}">
            ${escapeHTML(room)}
          </option>`
      )
      .join("");


  $("#roomFilter").value =
    rooms.includes(current)
      ? current
      : "all";

}


function updateCategoryFilter() {

  const current =
    $("#categoryFilter")
      .value;


  const categories =
    [
      ...new Set(
        inventory
          .map(
            item => item.category
          )
          .filter(Boolean)
      )
    ]
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            "id"
          )
      );


  $("#categoryFilter").innerHTML =

    `<option value="all">
      Semua Kategori
    </option>` +

    categories
      .map(
        category =>
          `<option value="${escapeHTML(category)}">
            ${escapeHTML(category)}
          </option>`
      )
      .join("");


  $("#categoryFilter").value =
    categories.includes(current)
      ? current
      : "all";

}


/* ============================================================
   CHART
============================================================ */

function renderCharts() {

  const good =
    sumCondition("Baik");


  const minor =
    sumCondition("Rusak Ringan");


  const major =
    sumCondition("Rusak Berat");


  const total =
    good + minor + major;


  renderDonut(
    "#donutChart",
    "#chartTotal",
    good,
    minor,
    major,
    total
  );


  renderDonut(
    "#dashboardDonut",
    "#dashboardChartTotal",
    good,
    minor,
    major,
    total
  );


  const rows = [

    [
      "Baik",
      good,
      "legend-dot"
    ],

    [
      "Rusak Ringan",
      minor,
      "legend-dot minor"
    ],

    [
      "Rusak Berat",
      major,
      "legend-dot major"
    ]

  ];


  const legend =
    rows
      .map(
        ([label, value, cls]) => `

          <div class="legend-row">

            <div class="legend-left">

              <span
                class="${cls}"
              ></span>

              <span>
                ${label}
              </span>

            </div>

            <span class="legend-value">
              ${value} unit
            </span>

          </div>

        `
      )
      .join("");


  $("#chartLegend").innerHTML =
    legend;


  $("#dashboardLegend").innerHTML =
    legend;

}


function renderDonut(
  selector,
  totalSelector,
  good,
  minor,
  major,
  total
) {

  const element =
    $(selector);


  $(totalSelector).textContent =
    total;


  if (!total) {

    element.style.background =
      "conic-gradient(#334155 0deg 360deg)";

    return;

  }


  const goodDeg =
    good / total * 360;


  const minorDeg =
    minor / total * 360;


  element.style.background =

    `conic-gradient(
      #2563EB 0deg ${goodDeg}deg,
      #06B6D4 ${goodDeg}deg ${goodDeg + minorDeg}deg,
      #334155 ${goodDeg + minorDeg}deg 360deg
    )`;

}


/* ============================================================
   CATEGORY STATS
============================================================ */

function renderCategoryStats() {

  const map = {};


  inventory.forEach(
    item => {

      map[item.category] =
        (
          map[item.category] ||
          0
        ) +
        item.quantity;

    }
  );


  const rows =
    Object.entries(map)
      .sort(
        (a, b) =>
          b[1] - a[1]
      );


  if (!rows.length) {

    $("#categoryStats").innerHTML = `

      <div class="empty-state">

        <h3>
          Belum ada data kategori
        </h3>

        <p>
          Data kategori akan muncul setelah inventaris ditambahkan.
        </p>

      </div>

    `;

    return;

  }


  const max =
    rows[0]?.[1] || 1;


  $("#categoryStats").innerHTML =
    rows
      .map(
        ([category, count]) => `

          <div class="room-row">

            <div class="room-row-head">

              <span>
                ${escapeHTML(category)}
              </span>

              <span>
                ${count} unit
              </span>

            </div>


            <div class="room-bar">

              <span
                style="width:${count / max * 100}%"
              ></span>

            </div>

          </div>

        `
      )
      .join("");

}


/* ============================================================
   ROOM STATS
============================================================ */

function renderRoomStats() {

  const map = {};


  inventory.forEach(
    item => {

      map[item.room] =
        (
          map[item.room] ||
          0
        ) +
        item.quantity;

    }
  );


  const rows =
    Object.entries(map)
      .sort(
        (a, b) =>
          b[1] - a[1]
      );


  const max =
    rows[0]?.[1] || 1;


  $("#roomStats").innerHTML =
    rows.length

      ? rows
          .map(
            ([room, count]) => `

              <div class="room-row">

                <div class="room-row-head">

                  <span>
                    ${escapeHTML(room)}
                  </span>

                  <span>
                    ${count} unit
                  </span>

                </div>


                <div class="room-bar">

                  <span
                    style="width:${count / max * 100}%"
                  ></span>

                </div>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty-state">

          <h3>
            Belum ada data ruangan
          </h3>

          <p>
            Data akan muncul setelah inventaris ditambahkan.
          </p>

        </div>

      `;

}


/* ============================================================
   DETAIL
============================================================ */

function viewItem(id) {

  const item =
    inventory.find(
      row => row.id === id
    );


  if (!item) {
    return;
  }


  selectedDetailId =
    id;


  $("#detailTitle").textContent =
    item.name;


  const cls =
    item.condition === "Baik"
      ? "badge-good"
      : item.condition === "Rusak Ringan"
        ? "badge-minor"
        : "badge-major";


  $("#detailContent").innerHTML = `

    <div class="detail-item">

      <span>
        Nama Barang
      </span>

      <strong>
        ${escapeHTML(item.name)}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Kode Inventaris
      </span>

      <strong>
        ${escapeHTML(item.code)}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Kategori
      </span>

      <strong>
        ${escapeHTML(item.category)}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Ruangan
      </span>

      <strong>
        ${escapeHTML(item.room)}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Lokasi / Rak
      </span>

      <strong>
        ${escapeHTML(item.location || "-")}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Jumlah
      </span>

      <strong>
        ${item.quantity} unit
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Kondisi
      </span>

      <strong>

        <span class="badge ${cls}">
          ${escapeHTML(item.condition)}
        </span>

      </strong>

    </div>


    <div class="detail-item">

      <span>
        Harga Satuan
      </span>

      <strong>
        ${formatRupiah(item.unitPrice)}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Total Nilai Aset
      </span>

      <strong>
        ${formatRupiah(
          getAssetValue(item)
        )}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Tanggal Pembelian
      </span>

      <strong>
        ${formatDateOnly(
          item.purchaseDate
        )}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Penanggung Jawab
      </span>

      <strong>
        ${escapeHTML(
          item.responsible || "-"
        )}
      </strong>

    </div>


    <div class="detail-item">

      <span>
        Terakhir Diperbarui
      </span>

      <strong>
        ${formatDate(
          item.updatedAt
        )}
      </strong>

    </div>


    <div class="detail-item full-detail">

      <span>
        Catatan
      </span>

      <strong>
        ${escapeHTML(
          item.notes || "Tidak ada catatan."
        )}
      </strong>

    </div>

  `;


  $("#detailModal")
    .classList
    .remove("hidden");

}


function closeModal() {

  $("#detailModal")
    ?.classList
    .add("hidden");


  selectedDetailId =
    null;

}


function editFromModal() {

  if (selectedDetailId) {

    editItem(
      selectedDetailId
    );

  }

}


function deleteFromModal() {

  if (selectedDetailId) {

    deleteItem(
      selectedDetailId
    );

  }

}


/* ============================================================
   RESET FILTER
============================================================ */

function resetFilters() {

  $("#searchInput").value =
    "";

  $("#roomFilter").value =
    "all";

  $("#categoryFilter").value =
    "all";

  $("#conditionFilter").value =
    "all";

  $("#sortFilter").value =
    "newest";


  renderTable();

}


/* ============================================================
   FORM TOTAL
============================================================ */

function updateFormTotal() {

  const quantity =
    Number(
      $("#quantity")?.value
    ) || 0;


  const unitPrice =
    Number(
      $("#unitPrice")?.value
    ) || 0;


  $("#formTotalValue").textContent =
    formatRupiah(
      quantity *
      unitPrice
    );

}


/* ============================================================
   ASSET
============================================================ */

function getAssetValue(item) {

  return (
    Number(item.quantity) || 0
  ) *
  (
    Number(item.unitPrice) || 0
  );

}


/* ============================================================
   BACKUP
============================================================ */

function exportData() {

  const payload = {

    app:
      "LIBVENTORY",

    version:
      "4.0",

    exportedAt:
      new Date().toISOString(),

    inventory

  };


  downloadFile(

    `backup-libventory-${
      new Date()
        .toISOString()
        .slice(0, 10)
    }.json`,

    JSON.stringify(
      payload,
      null,
      2
    ),

    "application/json"

  );


  showToast(
    "Backup JSON berhasil dibuat."
  );

}


/* ============================================================
   IMPORT
============================================================ */

function importData(event) {

  const file =
    event.target.files[0];


  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = () => {

    try {

      const parsed =
        JSON.parse(
          reader.result
        );


      const imported =
        Array.isArray(parsed)
          ? parsed
          : parsed.inventory;


      if (
        !Array.isArray(
          imported
        )
      ) {

        throw new Error();

      }


      let added = 0;

      let updated = 0;


      const codes =
        new Set(
          inventory.map(
            item =>
              item.code.toLowerCase()
          )
        );


      imported.forEach(
        rawItem => {

          const item =
            normalizeItem(
              rawItem
            );


          if (!item) {
            return;
          }


          const existing =
            inventory.find(
              current =>
                current.code.toLowerCase() ===
                item.code.toLowerCase()
            );


          if (existing) {

            const replace =
              confirm(
                `Kode ${item.code} sudah ada. Apakah ingin memperbarui data tersebut?`
              );


            if (replace) {

              const index =
                inventory.findIndex(
                  current =>
                    current.id ===
                    existing.id
                );


              inventory[index] = {

                ...item,

                id:
                  existing.id,

                updatedAt:
                  Date.now()

              };


              updated++;

            }

            return;

          }


          if (
            !codes.has(
              item.code.toLowerCase()
            )
          ) {

            inventory.push(item);

            codes.add(
              item.code.toLowerCase()
            );

            added++;

          }

        }
      );


      saveData();

      renderAll();


      showToast(
        `${added} data ditambahkan, ${updated} data diperbarui.`
      );


    } catch {

      showToast(
        "File JSON tidak valid."
      );

    }


    event.target.value = "";

  };


  reader.readAsText(file);

}


/* ============================================================
   LOCAL BACKUP
============================================================ */

function createLocalBackup() {

  if (!inventory.length) {

    showToast(
      "Tidak ada data untuk di-backup."
    );

    return;

  }


  const payload = {

    createdAt:
      new Date().toISOString(),

    inventory

  };


  localStorage.setItem(
    LOCAL_BACKUP_KEY,
    JSON.stringify(payload)
  );


  updateLocalBackupStatus();


  showToast(
    "Backup lokal berhasil dibuat."
  );

}


function restoreLocalBackup() {

  const raw =
    localStorage.getItem(
      LOCAL_BACKUP_KEY
    );


  if (!raw) {

    showToast(
      "Backup lokal belum tersedia."
    );

    return;

  }


  if (
    !confirm(
      "Pulihkan data dari backup lokal? Data saat ini akan digantikan."
    )
  ) {

    return;

  }


  try {

    const parsed =
      JSON.parse(raw);


    if (
      !Array.isArray(
        parsed.inventory
      )
    ) {

      throw new Error();

    }


    inventory =
      parsed.inventory
        .map(normalizeItem)
        .filter(Boolean);


    saveData();

    renderAll();


    showToast(
      "Backup lokal berhasil dipulihkan."
    );

  } catch {

    showToast(
      "Backup lokal tidak valid."
    );

  }

}


function updateLocalBackupStatus() {

  const raw =
    localStorage.getItem(
      LOCAL_BACKUP_KEY
    );


  const element =
    $("#localBackupStatus");


  if (!element) {
    return;
  }


  if (!raw) {

    element.textContent =
      "Belum tersedia";

    return;

  }


  try {

    const parsed =
      JSON.parse(raw);


    element.textContent =
      formatDate(
        new Date(
          parsed.createdAt
        ).getTime()
      );

  } catch {

    element.textContent =
      "Tidak valid";

  }

}


/* ============================================================
   CLEAR
============================================================ */

function clearData() {

  if (!inventory.length) {

    showToast(
      "Data inventaris masih kosong."
    );

    return;

  }


  if (
    !confirm(
      "Apakah Anda yakin ingin menghapus seluruh data inventaris?"
    )
  ) {

    return;

  }


  inventory = [];


  saveData();


  resetForm();


  renderAll();


  showToast(
    "Seluruh data inventaris telah dikosongkan."
  );

}


/* ============================================================
   DOWNLOAD
============================================================ */

function downloadFile(
  filename,
  content,
  type
) {

  const blob =
    new Blob(
      [content],
      { type }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const anchor =
    document.createElement(
      "a"
    );


  anchor.href =
    url;

  anchor.download =
    filename;


  document.body.appendChild(
    anchor
  );


  anchor.click();


  anchor.remove();


  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );

}


/* ============================================================
   THEME
============================================================ */

function toggleTheme() {

  document.body
    .classList
    .toggle("dark");


  const dark =
    document.body
      .classList
      .contains("dark");


  localStorage.setItem(
    THEME_KEY,
    dark
      ? "dark"
      : "light"
  );


  updateThemeButton();

}


function applySavedTheme() {

  let theme =
    localStorage.getItem(
      THEME_KEY
    );


  if (!theme) {

    theme =
      localStorage.getItem(
        OLD_THEME_KEY
      );

  }


  if (
    theme === "dark"
  ) {

    document.body
      .classList
      .add("dark");

  }


  updateThemeButton();

}


function updateThemeButton() {

  const dark =
    document.body
      .classList
      .contains("dark");


  if ($("#themeBtn")) {

    $("#themeBtn").textContent =
      dark
        ? "☀"
        : "☾";

  }

}


/* ============================================================
   NETWORK
============================================================ */

function updateNetworkStatus() {

  const element =
    $("#onlineStatus");


  if (!element) {
    return;
  }


  if (navigator.onLine) {

    element.textContent =
      "● Online";

    element.className =
      "status-online";

  } else {

    element.textContent =
      "● Offline";

    element.className =
      "status-online status-offline";

  }

}


/* ============================================================
   PWA
============================================================ */

async function installPWA() {

  if (
    !deferredInstallPrompt
  ) {

    showToast(
      "Gunakan menu browser untuk menambahkan LIBVENTORY ke Home Screen."
    );

    return;

  }


  deferredInstallPrompt.prompt();


  const result =
    await deferredInstallPrompt
      .userChoice;


  if (
    result.outcome ===
    "accepted"
  ) {

    $("#installBtn")
      ?.classList
      .add("hidden");

  }


  deferredInstallPrompt =
    null;

}


async function registerServiceWorker() {

  const status =
    $("#pwaStatus");


  if (
    !("serviceWorker" in navigator)
  ) {

    if (status) {

      status.textContent =
        "Tidak tersedia";

    }

    return;

  }


  try {

    await navigator.serviceWorker.register(
      "./service-worker.js"
    );


    if (status) {

      status.textContent =
        "Aktif";

    }

  } catch {

    if (status) {

      status.textContent =
        "Gagal didaftarkan";

    }

  }

}


/* ============================================================
   RENDER ALL
============================================================ */

function renderAll() {

  updateStats();

  updateRoomFilter();

  updateCategoryFilter();

  renderTable();

  renderCharts();

  renderRecent();

  renderRoomStats();

  renderCategoryStats();

  updateLocalBackupStatus();


  const totalUnits =
    inventory.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );


  $("#storageCount").textContent =
    `${totalUnits} unit tersimpan`;

}


/* ============================================================
   HELPERS
============================================================ */

function createId() {

  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {

    return window.crypto.randomUUID();

  }


  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );

}


function formatRupiah(value) {

  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value) || 0
  );

}


function formatDate(timestamp) {

  if (!timestamp) {
    return "-";
  }


  return new Date(
    timestamp
  ).toLocaleString(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );

}


function formatDateOnly(date) {

  if (!date) {
    return "-";
  }


  const parsed =
    new Date(
      `${date}T00:00:00`
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return "-";

  }


  return parsed.toLocaleDateString(
    "id-ID",
    {
      dateStyle: "medium"
    }
  );

}


function showToast(message) {

  const toast =
    $("#toast");


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    showToast.timer
  );


  showToast.timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2800
    );

}


function escapeHTML(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      character =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[character]
    );

}


/* ============================================================
   GLOBAL FUNCTIONS
============================================================ */

window.viewItem =
  viewItem;

window.editItem =
  editItem;

window.deleteItem =
  deleteItem;