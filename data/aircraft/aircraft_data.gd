class_name AircraftData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var role: String = ""
@export var nation: String = ""
@export_multiline var description: String = ""
## "fixed_wing" | "helicopter"
@export var category: String = "fixed_wing"
@export var manufacturer: String = ""
## Domini tech era label for tree columns (e.g. "Cold War", "Modern").
@export var era: String = ""
@export var tier: String = "Newbie"
@export var potentiality_filled: int = 1
@export var potentiality_max: int = 5
@export var preview: Texture2D
@export var card_image: Texture2D
@export var flag: Texture2D
@export var model_scene: PackedScene

## Placeholder IRL-flavored stats — edit later. Not final balance.
@export var irl_basis: String = ""
@export var max_speed_kmh: int = 0
@export var mach_max: float = 0.0
@export var combat_radius_km: int = 0
@export var service_ceiling_m: int = 0
@export var empty_weight_kg: int = 0
@export var thrust_kn: float = 0.0
@export var hardpoints: int = 0
@export var crew: int = 1

## Sensors / self-protect — drive mission HUD realism per airframe.
## Radar display range in meters (scope clips to this). 0 = use code default.
@export var radar_range_m: float = 0.0
## RWR sees radar track + SARH/ARH launches. MAWS sees IR missile launches.
@export var has_rwr: bool = true
@export var has_maws: bool = false

## Placeholder upgrade kits — unique per airframe. Replace with real modules later.
## Each entry: { "id", "name", "slot", "desc", "locked" }
@export var upgrade_modules: Array = []

## Airbook / Concept C — lineage + ship status.
@export var future_update: bool = false
@export var lineage_family: String = ""
@export var variant_code: String = ""
## Starter loadout lines shown in Airbook dossier stats (not description).
@export var starter_weapons: PackedStringArray = []
