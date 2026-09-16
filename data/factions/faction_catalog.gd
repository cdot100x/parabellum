class_name FactionCatalog
extends RefCounted

## International allegiances — countries keep continents; this is loyalty, not geography.

const ALIGN_IEF := "ief_bloc"
const ALIGN_BLIC := "blic_bloc"

const FACTIONS: Array[Dictionary] = [
	{
		"id": "ief",
		"short": "IEF",
		"name": "INTERPLANETARY EXPEDITION FORCES",
		"brief": "NATO/CSTO-mix coalition. Regular + SOF doctrine. Sides with ICAF.",
		"alignment": ALIGN_IEF,
		"accent": Color(0.35, 0.65, 1.0),
	},
	{
		"id": "blic",
		"short": "BLIC",
		"name": "BLOC LINEAR INDEPENDENT COUNTRIES",
		"brief": "ASEAN/SEATO/GCC/AU-mix bloc. Inherently hostile. NPF rides with them.",
		"alignment": ALIGN_BLIC,
		"accent": Color(0.85, 0.35, 0.3),
	},
	{
		"id": "npf",
		"short": "NPF",
		"name": "NEW ORDER PROTECTION FORCES",
		"brief": "Chaos at all costs. AES-worse. Represents alongside BLIC.",
		"alignment": ALIGN_BLIC,
		"accent": Color(0.95, 0.55, 0.2),
	},
	{
		"id": "icaf",
		"short": "ICAF",
		"name": "INTERNATIONAL COALITION ALLIED FORCES",
		"brief": "ISAF/NATO-flavor allied command. Sides with IEF.",
		"alignment": ALIGN_IEF,
		"accent": Color(0.45, 0.85, 0.65),
	},
]


static func all_factions() -> Array[Dictionary]:
	return FACTIONS


static func faction_by_id(faction_id: String) -> Dictionary:
	for entry in FACTIONS:
		if str(entry.get("id", "")) == faction_id:
			return entry
	return {}


static func accent(faction_id: String) -> Color:
	var entry := faction_by_id(faction_id)
	if entry.is_empty():
		return Color(0.7, 0.75, 0.8)
	return entry.get("accent", Color(0.7, 0.75, 0.8)) as Color


static func countries_for_faction(faction_id: String) -> Array[Dictionary]:
	return InfantryRoster.countries_for_faction(faction_id)


static func faction_for_country(country_id: String) -> String:
	var c := InfantryRoster.country_by_id(country_id)
	return str(c.get("faction", ""))
