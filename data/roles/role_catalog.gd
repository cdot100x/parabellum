class_name RoleCatalog
extends RefCounted

## Stage 1 ground role bible: kits, tier stubs, Support Call pools.
## Doctrine filters come later — this is universal role rules only.

const POOL_NONE := "none"
const POOL_INTEL := "intel"
const POOL_SOF := "sof"
const POOL_SL := "sl"
const POOL_RADIO := "radio"

## Full Support Calls board (ids match SupportCallsMenu.CALLS).
const POOL_IDS := {
	POOL_NONE: [],
	POOL_INTEL: ["uav", "ecm", "esm"],
	POOL_SOF: ["uav", "ecm", "fpv", "bygul", "guided_rocket", "mortar"],
	POOL_SL: ["uav", "ecm", "fpv", "bygul", "guided_rocket", "mortar", "precision_arty"],
	POOL_RADIO: [
		"uav", "ecm", "esm", "fpv", "bygul", "guided_rocket", "mortar", "precision_arty",
		"kali", "fencer", "saturation", "wp", "cas", "sunhawk", "rotary",
	],
}

const ROLES: Array[Dictionary] = [
	{
		"id": "rifleman",
		"name": "RIFLEMAN",
		"brief": "Default fighter. Open guns, general utility. No strike authority.",
		"specialist_label": "General utility",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "Ammo pouch",
		"tier_mid": "Extra equipment",
		"tier_high": "Combat resupply",
	},
	{
		"id": "medic",
		"name": "MEDIC",
		"brief": "Keep the squad breathing. Medical kit ladder — no Support Calls.",
		"specialist_label": "Medical equipment",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "Medical bag",
		"tier_mid": "Emergency revive",
		"tier_high": "Mass-casualty station",
	},
	{
		"id": "support",
		"name": "SUPPORT",
		"brief": "Ammo and suppression logistics. Crates and drops, not jets.",
		"specialist_label": "Ammo / suppression",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "Ammo crate",
		"tier_mid": "Resupply drop",
		"tier_high": "Heavy supply drop",
	},
	{
		"id": "heavy",
		"name": "HEAVY",
		"brief": "Hold ground with LMGs and heavy ammo. No strike authority.",
		"specialist_label": "Heavy weapons",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "Heavy ammo",
		"tier_mid": "Heavy weapons resupply",
		"tier_high": "Heavy weapons deployment",
	},
	{
		"id": "engineer",
		"name": "ENGINEER",
		"brief": "Repair, breach, deny. Field systems (sentry / SAM later) — not theater calls.",
		"specialist_label": "Repair / explosives",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "Repair kit",
		"tier_mid": "AT / utility resupply",
		"tier_high": "Vehicle repair station",
	},
	{
		"id": "anti_armor",
		"name": "ANTI-ARMOR",
		"brief": "Kill vehicles. Specialist launcher locked; primaries stay open.",
		"specialist_label": "RPG / AT-4 / Javelin",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "AT resupply",
		"tier_mid": "Vehicle tracker",
		"tier_high": "Precision AT strike",
	},
	{
		"id": "anti_air",
		"name": "ANTI-AIR",
		"brief": "Kill aircraft. MANPADS locked; portable SAM is kit/streak, not Radio CAS.",
		"specialist_label": "Stinger / Igla",
		"call_pool": POOL_NONE,
		"max_calls": 0,
		"tier_low": "MANPADS resupply",
		"tier_mid": "Air-warning radar",
		"tier_high": "Temporary SAM site",
	},
	{
		"id": "recon",
		"name": "RECON",
		"brief": "Find and mark. Soft intel Support Calls only — eyes, not thunder.",
		"specialist_label": "Drone / designator",
		"call_pool": POOL_INTEL,
		"max_calls": 2,
		"tier_low": "Recon drone",
		"tier_mid": "UAV sweep",
		"tier_high": "Persistent surveillance UAV",
	},
	{
		"id": "sof",
		"name": "SOF",
		"brief": "Raid kit + limited precision Support Calls. Dirty deletes, not theater bombing.",
		"specialist_label": "Raid kit (breach / flash / silent)",
		"call_pool": POOL_SOF,
		"max_calls": 2,
		"tier_low": "Breach / flash",
		"tier_mid": "FPV / Bygul window",
		"tier_high": "Guided precision package",
	},
	{
		"id": "squad_lead",
		"name": "SQUAD LEAD",
		"brief": "Lead the fireteam. Mid-tier Support Calls — not Sunhawk / saturation.",
		"specialist_label": "Command equipment",
		"call_pool": POOL_SL,
		"max_calls": 3,
		"tier_low": "Squad rally",
		"tier_mid": "Supply request",
		"tier_high": "Coordinated fire support",
	},
	{
		"id": "radio",
		"name": "RADIO",
		"brief": "Strike authority. Full Support Calls board — the phone that brings hell.",
		"specialist_label": "Radio / targeting",
		"call_pool": POOL_RADIO,
		"max_calls": 3,
		"tier_low": "Mortar",
		"tier_mid": "Artillery",
		"tier_high": "CAS / bombing run",
	},
]


static func all_roles() -> Array[Dictionary]:
	return ROLES


static func role_by_id(role_id: String) -> Dictionary:
	for entry in ROLES:
		if str(entry.get("id", "")) == role_id:
			return entry
	return {}


static func call_pool_id(role_id: String) -> String:
	var entry := role_by_id(role_id)
	if entry.is_empty():
		return POOL_NONE
	return str(entry.get("call_pool", POOL_NONE))


static func max_selected(role_id: String) -> int:
	var entry := role_by_id(role_id)
	if entry.is_empty():
		return 0
	return int(entry.get("max_calls", 0))


static func allowed_call_ids(role_id: String) -> PackedStringArray:
	var pool := call_pool_id(role_id)
	var raw: Variant = POOL_IDS.get(pool, [])
	var out: PackedStringArray = PackedStringArray()
	if raw is Array:
		for id in raw:
			out.append(str(id))
	return out


static func has_support_calls(role_id: String) -> bool:
	return not allowed_call_ids(role_id).is_empty()


static func filter_call_entries(all_calls: Array, role_id: String) -> Array[Dictionary]:
	var allow := allowed_call_ids(role_id)
	var out: Array[Dictionary] = []
	if allow.is_empty():
		return out
	for entry in all_calls:
		if entry is Dictionary and allow.has(str(entry.get("id", ""))):
			out.append(entry as Dictionary)
	return out
