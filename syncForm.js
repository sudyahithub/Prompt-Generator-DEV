// Dexie DB setup (must only run once)
if (!window.formDB) {
  const db = new Dexie("PromptFormDB");
  db.version(1).stores({
    formStates: 'key'
  });
  window.formDB = db;
}

// Get a unique tab ID to isolate saves between tabs
const tabId = sessionStorage.getItem('tabId') || crypto.randomUUID();
sessionStorage.setItem('tabId', tabId);

// Get page name (e.g., Client_persona.html)
function getPageKey() {
  const page = window.location.pathname.split('/').pop().replace('.html', '');
  return `${page}_${tabId}`;
}

// Save form state
window.saveFormState = async function () {
  const key = getPageKey();
  const elements = document.querySelectorAll('input, textarea, select');
  const state = {};

  elements.forEach(el => {
    const id = el.id || el.name;
    if (!id) return;

    if (el.type === 'checkbox') {
      state[id] = el.checked;
    } else if (el.tagName === 'SELECT' && el.multiple) {
      state[id] = Array.from(el.selectedOptions).map(opt => opt.value);
    } else {
      state[id] = el.value;
    }
  });

  // ✅ Add quantities
  if (window.optionQuantities) {
    state.__quantities = window.optionQuantities;
  }

  await window.formDB.formStates.put({ key, value: state });
};


// Restore form state
window.restoreFormState = async function () {
  const key = getPageKey();
  const record = await window.formDB.formStates.get(key);
  if (!record || !record.value) return;

  const state = record.value;
  const elements = document.querySelectorAll('input, textarea, select');

  elements.forEach(el => {
    const id = el.id || el.name;
    if (!id || !(id in state)) return;

    if (el.type === 'checkbox') {
      el.checked = state[id];
    } else if (el.tagName === 'SELECT' && el.multiple) {
      Array.from(el.options).forEach(opt => {
        opt.selected = state[id].includes(opt.value);
      });
    } else {
      el.value = state[id];
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // ✅ Restore quantities
  if (state.__quantities && typeof state.__quantities === 'object') {
    window.optionQuantities = state.__quantities;

    // Re-render quantity inputs
    document.querySelectorAll('select[multiple]').forEach(select => {
      const fieldId = select.id || normalizeId(select.id);
      const container = select.closest('.search-wrapper')?.querySelector('.quantity-container');
        updateQuantitiesForSelect(select, container, fieldId);
      
    });
  }
};

