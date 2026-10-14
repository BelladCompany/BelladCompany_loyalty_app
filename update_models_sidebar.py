import os

file_path = r"d:\kavya k bellad p\loyalty backup src\final backup - befoore master table\client\src\screens\StandaloneMasterEditorPortal.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update models_group items
old_models_def = """  {
    id: 'models_group',
    title: 'Automobile Models & Brands',
    icon: Car,
    items: [
      { id: 'models_hero_2w', label: 'Hero 2-Wheelers', icon: Bike, badge: '2W', countKey: 'hero' },
      { id: 'models_tata_4w', label: 'Tata 4-Wheelers', icon: Car, badge: '4W', countKey: 'tata' },
      { id: 'models_mg_ev', label: 'MG Motors (EV Models)', icon: Zap, badge: 'EV', countKey: 'mg' },
      { id: 'models_all', label: 'All Brands & Models', icon: Layers, countKey: 'all_models' },
    ],
  },"""

new_models_def = """  {
    id: 'models_group',
    title: 'Automobile Models',
    icon: Car,
    items: [
      { id: 'models_2w', label: '2-Wheeler (2W)', icon: Bike, badge: '2W', countKey: '2w' },
      { id: 'models_4w', label: '4-Wheeler (4W)', icon: Car, badge: '4W', countKey: '4w' },
      { id: 'models_ev', label: 'Electric Vehicle (EV)', icon: Zap, badge: 'EV', countKey: 'ev' },
      { id: 'models_all', label: 'All Models', icon: Layers, countKey: 'all_models' },
    ],
  },"""

if old_models_def in code:
    code = code.replace(old_models_def, new_models_def)
    print("Updated models_group items: 2-Wheeler, 4-Wheeler, EV, All Models!")
else:
    print("Warning: old_models_def not found!")

# 2. Update category mapping filter in filteredRules
old_filter = """    // Category mapping
    if (activeCategory === 'models_hero_2w') {
      return rule.vehicle_type === '2W' || (rule.brand_name && rule.brand_name.toLowerCase().includes('hero'));
    }
    if (activeCategory === 'models_tata_4w') {
      return rule.vehicle_type === '4W' || (rule.brand_name && rule.brand_name.toLowerCase().includes('tata'));
    }
    if (activeCategory === 'models_mg_ev') {
      return rule.vehicle_type === 'EV' || (rule.brand_name && rule.brand_name.toLowerCase().includes('mg'));
    }
    if (activeCategory === 'models_all') {
      return true;
    }"""

new_filter = """    // Category mapping (Clean Vehicle Types: 2W, 4W, EV, All)
    if (activeCategory === 'models_2w' || activeCategory === 'models_hero_2w') {
      return rule.vehicle_type === '2W';
    }
    if (activeCategory === 'models_4w' || activeCategory === 'models_tata_4w') {
      return rule.vehicle_type === '4W';
    }
    if (activeCategory === 'models_ev' || activeCategory === 'models_mg_ev') {
      return rule.vehicle_type === 'EV';
    }
    if (activeCategory === 'models_all') {
      return true;
    }"""

if old_filter in code:
    code = code.replace(old_filter, new_filter)
    print("Updated filteredRules mapping for clean vehicle types!")
else:
    print("Warning: old_filter not found!")

# 3. Update getCategoryCount
old_count = """      case 'hero':
        return rules.filter((r) => r.vehicle_type === '2W' || (r.brand_name && r.brand_name.toLowerCase().includes('hero'))).length;
      case 'tata':
        return rules.filter((r) => r.vehicle_type === '4W' || (r.brand_name && r.brand_name.toLowerCase().includes('tata'))).length;
      case 'mg':
        return rules.filter((r) => r.vehicle_type === 'EV' || (r.brand_name && r.brand_name.toLowerCase().includes('mg'))).length;"""

new_count = """      case '2w':
      case 'hero':
        return rules.filter((r) => r.vehicle_type === '2W').length;
      case '4w':
      case 'tata':
        return rules.filter((r) => r.vehicle_type === '4W').length;
      case 'ev':
      case 'mg':
        return rules.filter((r) => r.vehicle_type === 'EV').length;"""

if old_count in code:
    code = code.replace(old_count, new_count)
    print("Updated getCategoryCount for 2w, 4w, ev!")
else:
    print("Warning: old_count not found!")

# 4. Update openCreateModal for models_
old_modal_models = """      if (cat === 'models_hero_2w') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `HERO-2W-${Date.now().toString().slice(-4)}`,
          rule_name: 'Hero Two-Wheeler Policy Rule',
          vehicle_type: '2W',
          brand_name: 'Hero',
          models: ['Splendor', 'HF Deluxe', 'Passion'],
        };
      } else if (cat === 'models_tata_4w') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `TATA-4W-${Date.now().toString().slice(-4)}`,
          rule_name: 'Tata Four-Wheeler Policy Rule',
          vehicle_type: '4W',
          brand_name: 'Tata Motors',
          models: ['Nexon', 'Curvv', 'Harrier', 'Punch'],
        };
      } else if (cat === 'models_mg_ev') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `MG-EV-${Date.now().toString().slice(-4)}`,
          rule_name: 'MG Motors EV Bodyshop Campaign',
          vehicle_type: 'EV',
          brand_name: 'MG Motors',
          models: ['MG ZS EV', 'Comet EV'],
          spend_type: 'bodyshop',
          branches: ['Belagavi'],
          discount_value: 40,
        };
      } else {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `MODEL-${Date.now().toString().slice(-4)}`,
          rule_name: 'Automobile Model Policy Rule',
        };
      }"""

new_modal_models = """      if (cat === 'models_2w' || cat === 'models_hero_2w') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `2W-${Date.now().toString().slice(-4)}`,
          rule_name: '2-Wheeler (2W) Policy Rule',
          vehicle_type: '2W',
          brand_name: 'ALL',
          models: ['ALL'],
          description: 'Loyalty discount and points rule for 2-Wheelers',
        };
      } else if (cat === 'models_4w' || cat === 'models_tata_4w') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `4W-${Date.now().toString().slice(-4)}`,
          rule_name: '4-Wheeler (4W) Policy Rule',
          vehicle_type: '4W',
          brand_name: 'ALL',
          models: ['ALL'],
          description: 'Loyalty discount and points rule for 4-Wheelers',
        };
      } else if (cat === 'models_ev' || cat === 'models_mg_ev') {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `EV-${Date.now().toString().slice(-4)}`,
          rule_name: 'Electric Vehicle (EV) Policy Rule',
          vehicle_type: 'EV',
          brand_name: 'ALL',
          models: ['ALL'],
          description: 'Loyalty discount and points rule for Electric Vehicles',
        };
      } else {
        categoryDefaults = {
          ...categoryDefaults,
          rule_code: `ALL-MODELS-${Date.now().toString().slice(-4)}`,
          rule_name: 'All Vehicle Models Policy Rule',
          vehicle_type: 'ALL',
        };
      }"""

if old_modal_models in code:
    code = code.replace(old_modal_models, new_modal_models)
    print("Updated openCreateModal for models_2w, 4w, ev!")
else:
    print("Warning: old_modal_models not found!")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Saved models_group updates!")
