class_name InfantryRoster
extends RefCounted

## Country → org → operator roster. `faction` is international allegiance (IEF/BLIC/NPF/ICAF).

const COUNTRIES: Array[Dictionary] = [
	{
		"id": "ndr",
		"title": "Ngozi Democratic Republic",
		"short": "NDR",
		"faction": "ief",
		"orgs": [
			{
				"id": "ures",
				"title": "URES",
				"full": "Unité ya Ranger ya ba équipes spéciales",
				"ops": [
					{"id": "coil", "callsign": "COIL", "name": "Sgt. Patrick Mbemba", "note": "On spectrum"},
					{"id": "rust", "callsign": "RUST", "name": "Cpl. Dieudonné Kabeya", "note": "Fights dirty"},
				],
			},
			{
				"id": "cdn_fsn",
				"title": "CDN FSN",
				"full": "Commandement Forces spéciales ya Ngozi",
				"ops": [
					{"id": "locks", "callsign": "LOCKS", "name": "Sgt. Moïse Kalala", "note": "Dreads"},
					{"id": "ayah", "callsign": "AYAH", "name": "Cpl. Ibrahim Nasser", "note": "Faith under fire"},
					{"id": "anaconda", "callsign": "ANACONDA", "name": "Sgt. Jean-Pierre Mwamba", "note": "Heavy support"},
				],
			},
			{
				"id": "ndr_line",
				"title": "NDR Army",
				"full": "Line infantry",
				"ops": [],
			},
		],
	},
	{
		"id": "rtn",
		"title": "Republic Of The Ngozi",
		"short": "RTN",
		"faction": "ief",
		"orgs": [
			{
				"id": "bml",
				"title": "BML",
				"full": "Brigade Mécanisée ya Libération",
				"ops": [
					{"id": "mboka", "callsign": "MBOKA", "name": "Col. Jean-Baptiste Makaya", "note": "T-80U / 2S38 spear"},
				],
			},
			{
				"id": "rtn_line",
				"title": "RTN Army",
				"full": "Line infantry",
				"ops": [],
			},
		],
	},
	{
		"id": "bda",
		"title": "Federation Of Bassada",
		"short": "BDA",
		"faction": "ief",
		"orgs": [
			{
				"id": "bda_af",
				"title": "Bassada AF",
				"full": "Armed Forces",
				"ops": [],
			},
			{
				"id": "bda_sf",
				"title": "Bassada SF",
				"full": "Special Forces",
				"ops": [
					{"id": "anchor", "callsign": "ANCHOR", "name": "Adewale Okonkwo", "note": "Pair lead"},
					{"id": "spiky", "callsign": "SPIKY", "name": "Chinedu Bassey", "note": "Dreads"},
				],
			},
			{
				"id": "bda_thunder",
				"title": "3rd CFR Thunder Line",
				"full": "Bassadan Federal Artillery — 3rd Composite Fires Regiment",
				"ops": [
					{
						"id": "anvil",
						"callsign": "ANVIL",
						"name": "Maj. Chukwudi Okorie",
						"note": "M777 / M270 fires · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "raheza",
		"title": "Federal Republic Of Raheza",
		"short": "RAHEZA",
		"faction": "ief",
		"orgs": [
			{
				"id": "haze3",
				"title": "Haze-3",
				"full": "Special Operations Forces",
				"ops": [
					{"id": "rebar", "callsign": "REBAR", "name": "Sgt. Amadou Ouédraogo", "note": "Dreads · lead"},
					{"id": "smoke", "callsign": "SMOKE", "name": "Cpl. Bakary Sawadogo", "note": "Dreads"},
					{"id": "tote", "callsign": "TOTE", "name": "Cpl. Issa Kaboré", "note": "To'te lineage"},
					{"id": "grid", "callsign": "GRID", "name": "Cpl. Salif Zoungrana", "note": "Systems"},
				],
			},
			{
				"id": "main_rouge",
				"title": "Main Rouge",
				"full": "1er Régiment de Feux Lourds — Archer / BM-30 / Pereh",
				"ops": [
					{
						"id": "braise",
						"callsign": "BRAISE",
						"name": "Adj. Issouf Traoré",
						"note": "Artillery · ruthless · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "nid",
						"callsign": "NID",
						"name": "Sgt. Aminata Kaboré",
						"note": "Operator / FO · Pereh eye · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "srz",
		"title": "Southern Republic Of Zanzarbaria",
		"short": "SRZ",
		"faction": "ief",
		"orgs": [
			{"id": "srz_af", "title": "SRZ AF", "full": "Armed Forces", "ops": []},
		],
	},
	{
		"id": "kpdr",
		"title": "Kiheza Peoples Democratic Republic",
		"short": "KPDR",
		"faction": "ief",
		"orgs": [
			{
				"id": "kpdr_cru",
				"title": "CRU",
				"full": "National Police — Critical Response Unit",
				"ops": [
					{
						"id": "chuma",
						"callsign": "CHUMA",
						"name": "Insp. Yusuf Mwinyi",
						"note": "Kiswahili net · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "uta",
						"callsign": "UTA",
						"name": "Sgt. Baraka Ngoma",
						"note": "Compound raids · Coming soon",
						"coming_soon": true,
					},
				],
			},
			{"id": "kpdr_af", "title": "KPDR AF", "full": "Armed Forces", "ops": []},
		],
	},
	{
		"id": "valorterra",
		"title": "Federal Republic Of Valorterra",
		"short": "VAL",
		"faction": "ief",
		"orgs": [
			{
				"id": "hp_stun",
				"title": "HP-STUN",
				"full": "Holly Park PD — Special Tactical Urban Unit",
				"ops": [
					{
						"id": "rail",
						"callsign": "RAIL",
						"name": "Det. Sgt. Kwesi Asubiojo",
						"note": "Urban STUN · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "flag",
						"callsign": "FLAG",
						"name": "Cpl. Jabari Okonkwo",
						"note": "Dreads · Coming soon",
						"coming_soon": true,
					},
				],
			},
			{
				"id": "mef_raiders",
				"title": "MEF Raiders",
				"full": "Valorterran Armed Marine Forces — MEF Raiders",
				"ops": [
					{
						"id": "pelt",
						"callsign": "PELT",
						"name": "Cpl. Torben Varga",
						"note": "White Raider · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "moss",
						"callsign": "MOSS",
						"name": "Sgt. Shaheed Diallo",
						"note": "Dreads · ghillie · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "hide",
						"callsign": "HIDE",
						"name": "LCpl. Oluwatimi Bassey",
						"note": "Dreads · pelt hood · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "corvid",
						"callsign": "CORVID",
						"name": "Sgt. Iskandar Rahman",
						"note": "Dreads · raven · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "nomad",
						"callsign": "NOMAD",
						"name": "Sgt. Rafi Santoso",
						"note": "Dreads · Austronesian name · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "lakeya",
		"title": "United Provinces Of Lakeya",
		"short": "LAK",
		"faction": "ief",
		"orgs": [
			{
				"id": "rra",
				"title": "RRA",
				"full": "Rejiman Ranger Army",
				"ops": [
					{
						"id": "woch",
						"callsign": "WÒCH",
						"name": "Sgt. Jean-Baptiste Destiné",
						"note": "Field Operator · Kreyòl · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "palm",
						"callsign": "PALM",
						"name": "Cpl. Moïse Jean-Louis",
						"note": "Ranger NCO · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "aringelka",
		"title": "Federal Republic Of Aringelka",
		"short": "ARI",
		"faction": "ief",
		"orgs": [
			{
				"id": "dosa",
				"title": "DOSA",
				"full": "Directorate Security Agency",
				"ops": [
					{
						"id": "grene",
						"callsign": "GRÈNE",
						"name": "Capt. Mamadou Sall",
						"note": "Alpha-like · Coming soon",
						"coming_soon": true,
					},
				],
			},
			{
				"id": "sor455",
				"title": "455th SOR",
				"full": "455th Special Operations Regiment",
				"ops": [
					{
						"id": "lierre",
						"callsign": "LIERRE",
						"name": "Sgt. Cheikh Diop",
						"note": "Operator · Coming soon",
						"coming_soon": true,
					},
					{
						"id": "miroir",
						"callsign": "MIROIR",
						"name": "Cpl. Awa Ndiaye",
						"note": "Elusive · tricks enemies · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "cdelba",
		"title": "Cdelba Islands",
		"short": "CDEL",
		"faction": "ief",
		"orgs": [
			{
				"id": "udec",
				"title": "2e UDEC",
				"full": "Unité des missions non conventionnelles",
				"ops": [
					{
						"id": "beton",
						"callsign": "BÉTON",
						"name": "Adj. Kouassi Yao",
						"note": "Unconventional CQB · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "ampem",
		"title": "Federal Republic Of Ampem",
		"short": "AMP",
		"faction": "ief",
		"orgs": [
			{
				"id": "asgs",
				"title": "ASGS",
				"full": "Ampem Special Ground Service",
				"ops": [
					{
						"id": "static",
						"callsign": "STATIC",
						"name": "Sgt. Kwabena Mensah",
						"note": "EW / jam / hack · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "hakerissa",
		"title": "Republic Of Hakerissa",
		"short": "HAK",
		"faction": "ief",
		"orgs": [
			{
				"id": "para39",
				"title": "39th Para",
				"full": "39th Paratroopers Battalion",
				"ops": [
					{
						"id": "sahel",
						"callsign": "SAHEL",
						"name": "Sgt. Alpha Camara",
						"note": "Operator · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "smarena",
		"title": "Federal Republic Of Smarena",
		"short": "SMA",
		"faction": "ief",
		"orgs": [
			{
				"id": "uos1732",
				"title": "1732e UOS",
				"full": "1732e unité des opérations spéciales et à haut risque",
				"ops": [
					{
						"id": "cheche",
						"callsign": "CHÈCHE",
						"name": "Adj. Mahamat Idriss",
						"note": "Desert high-risk · Coming soon",
						"coming_soon": true,
					},
				],
			},
		],
	},
	{
		"id": "kzd",
		"title": "Federal Republic Of Kszadzie",
		"short": "KZD",
		"faction": "ief",
		"orgs": [
			{"id": "kzd_af", "title": "KZD AF", "full": "Armed Forces", "ops": []},
		],
	},
	{
		"id": "che",
		"title": "Federal Republic Of Chihebere",
		"short": "CHE",
		"faction": "npf",
		"orgs": [
			{"id": "che_af", "title": "CHE AF", "full": "Armed Forces (hostile)", "ops": []},
		],
	},
]


static func all_countries() -> Array[Dictionary]:
	return COUNTRIES


static func countries_for_faction(faction_id: String) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for c in COUNTRIES:
		if str(c.get("faction", "")) == faction_id:
			out.append(c)
	return out


static func country_by_id(country_id: String) -> Dictionary:
	for c in COUNTRIES:
		if str(c.get("id", "")) == country_id:
			return c
	return {}


static func org_in_country(country: Dictionary, org_id: String) -> Dictionary:
	var orgs: Array = country.get("orgs", [])
	for o_any in orgs:
		var o: Dictionary = o_any
		if str(o.get("id", "")) == org_id:
			return o
	return {}


static func op_in_org(org: Dictionary, op_id: String) -> Dictionary:
	var ops: Array = org.get("ops", [])
	for op_any in ops:
		var op: Dictionary = op_any
		if str(op.get("id", "")) == op_id:
			return op
	return {}


static func org_playable_in_sandbox(org_id: String) -> bool:
	return org_id == "ures" or org_id == "cdn_fsn" or InfantryPlaceholder.has_org_mesh(org_id)


static func ensure_selection(faction_id: String, country_id: String, org_id: String, op_id: String) -> Dictionary:
	## Returns { faction, country, org, op } ids normalized to valid roster entries.
	var fid := faction_id
	if FactionCatalog.faction_by_id(fid).is_empty():
		fid = "ief"
	var countries := countries_for_faction(fid)
	var cid := country_id
	var country := country_by_id(cid)
	if country.is_empty() or str(country.get("faction", "")) != fid:
		cid = str(countries[0].get("id", "")) if not countries.is_empty() else ""
		country = country_by_id(cid)
	var oid := org_id
	var org := org_in_country(country, oid)
	if org.is_empty():
		var orgs: Array = country.get("orgs", [])
		oid = str((orgs[0] as Dictionary).get("id", "")) if not orgs.is_empty() else ""
		org = org_in_country(country, oid)
	var opid := op_id
	var op := op_in_org(org, opid)
	if op.is_empty():
		var ops: Array = org.get("ops", [])
		opid = str((ops[0] as Dictionary).get("id", "")) if not ops.is_empty() else ""
	return {
		"faction": fid,
		"country": cid,
		"org": oid,
		"op": opid,
	}
