#!/usr/bin/env python3
"""Parse data/aircraft/*.tres → web/encyclopedia/js/data.js for the Domini Encyclopedia."""
from __future__ import annotations

import json
import re
import shutil
import struct
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRES_DIR = ROOT / "data" / "aircraft"
SITE = ROOT / "web" / "encyclopedia"
OUT = SITE / "js" / "data.js"
BUILD_JSON = SITE / "build.json"
MEDIA = SITE / "media"
MEDIA_CARDS = MEDIA / "cards"
MEDIA_FLAGS = MEDIA / "flags"
MEDIA_CAMPAIGNS = MEDIA / "campaigns"
CAMPAIGNS_JSON = ROOT / "data" / "campaigns" / "campaigns.json"
DOMINI_JSON = ROOT / "data" / "domini" / "domini.json"
NEWS_JSON = ROOT / "data" / "news" / "news.json"
NATIONS_DIR = ROOT / "assets" / "nations"
CAMPAIGN_ART_DIR = ROOT / "assets" / "ui" / "campaign"
NEWS_ART_DIR = ROOT / "assets" / "ui" / "news"
CARD_ART_DIR = ROOT / "assets" / "ui" / "aircraft_cards"
CAMPAIGN_PLACEHOLDER = CAMPAIGN_ART_DIR / "campaign_placeholder.png"
MEDIA_NEWS = SITE / "media" / "news"
DOMINI_MAP_SRC = ROOT / "assets" / "ui" / "domini" / "domini_map_wip.png"
DOMINI_MAP_FULL = ROOT / "assets" / "ui" / "domini" / "domini_map_wip_full.png"
MEDIA_DOMINI = MEDIA / "domini"
# Equirectangular web texture (2:1). Full 20k×10k is downsampled at build time.
DOMINI_WEB_W = 4096
DOMINI_WEB_H = 2048

AIR_ERAS = [
    {"id": "lead_in", "title": "I — Lead-In", "ids": ["koridor_k1", "xian_jf3"]},
    {"id": "cold_war", "title": "II — Cold War", "ids": ["cy25b_hogrider", "chiqiangi_ji8b"]},
    {
        "id": "multirole",
        "title": "III — Multirole Era",
        "ids": [
            "chiqiangi_ja11",
            "afa18c_fightingaggie",
            "dtc_f16sm3",
            "cy30kn_fortran",
            "cy30c_byk",
            "cy27kub",
        ],
    },
    {
        "id": "modern",
        "title": "IV — Modern",
        "ids": [
            "joost_fj22_pijl",
            "joost_fj40",
            "hulienjiang_jf10s",
            "hulienjiang_jf10de_long_tudi",
            "kac_kf12_tarpan",
            "cy35mvi_voron",
            "cy33ib_byelka",
            "cy34c_anakonda",
            "cy27_tema3",
            "tan_29k1_flamingo",
        ],
    },
    {
        "id": "apex",
        "title": "V — Apex",
        "ids": [
            "cy47sm_orel",
            "cy57m_harpyeagle",
            "hulienjiang_jf15dt_cao_kong_long",
            "fi22n_seahawk",
            "sai_s35a_trackhawk",
        ],
    },
]

SPECIAL_IDS = [
    "sai_s21a_deathless",
    "cykovskiy_o80_devils_tower",
    "northakron_xb100_viking",
    "northakron_b70_ram",
    "zhurbakiv_zh12m2_wishbone",
    "cy30mkk",
]

HELI_ERAS = [
    {
        "id": "heli_cw",
        "title": "I — Cold War",
        "ids": ["luther_uh1sm1_rat", "luther_ah1w_redhawk", "vikhr_vk24e_vympel"],
    },
    {
        "id": "heli_late",
        "title": "II — Late Cold War",
        "ids": [
            "lawrence_mh60_dap",
            "lawrence_sh60_orca",
            "lawrence_ch53_podarge",
            "doren_ah64d_ranger",
            "auroracopter",
        ],
    },
    {
        "id": "heli_modern",
        "title": "III — Modern",
        "ids": ["auroracopter_firehawk_ums2", "koralev_kr60_topaz", "yosuga_ahs66_shachi"],
    },
    {
        "id": "heli_next",
        "title": "IV — Next-Gen",
        "ids": ["lawrence_mh60x_stealth_predator", "doren_lawrence_rah66m_longhorn"],
    },
]

STR_KEYS = {
    "id",
    "display_name",
    "role",
    "nation",
    "description",
    "category",
    "manufacturer",
    "era",
    "tier",
    "irl_basis",
    "lineage_family",
    "variant_code",
}
NUM_KEYS = {
    "max_speed_kmh",
    "mach_max",
    "combat_radius_km",
    "service_ceiling_m",
    "empty_weight_kg",
    "thrust_kn",
    "hardpoints",
    "crew",
    "potentiality_filled",
    "potentiality_max",
}
BOOL_KEYS = {"future_update", "has_rwr", "has_maws"}

# Encyclopedia-only co-development partners (shared programs). Primary nation stays on AircraftData.
# Keys are shorthand matched against Domini country titles (case-insensitive substring / alias).
COOPERATED: dict[str, list[str]] = {
    "cy57m_harpyeagle": [
        "Valorterra",
        "Nakur-Yatshin",
        "New Akron",
        "Sumner",
        "Baltimore",
    ],
    "fi22n_seahawk": [
        "New Akron",
        "Baltimore",
        "Aurora",
        "Sumner",
        "Cyattersberg",
    ],
    "sai_s35a_trackhawk": [
        "Qiyang",
        "Tanayov",
        "Baltimore",
    ],
    "hulienjiang_jf15dt_cao_kong_long": [
        "Valorterra",
        "Cyattersberg",
        "Tanayov",
        "Kashtanistan",
    ],
}

# Nations named in co-op lists but not yet in Domini registry (no flag asset).
NATION_FALLBACKS: dict[str, dict[str, str]] = {
    "baltimore": {"nation": "Baltimore", "flag": ""},
}


def _domini_country_index(domini: dict) -> list[dict]:
    rows: list[dict] = []
    for cont in domini.get("continents") or []:
        for country in cont.get("countries") or []:
            title = str(country.get("title") or "").strip()
            if not title:
                continue
            flag = str(country.get("flag") or "").strip()
            rows.append({"nation": title, "flag": flag, "short": str(country.get("short") or "")})
    return rows


def _resolve_nation(token: str, catalog: list[dict]) -> dict:
    raw = token.strip()
    key = raw.casefold()
    if key in NATION_FALLBACKS:
        return dict(NATION_FALLBACKS[key])
    # Exact title match first, then short code, then substring on title.
    for row in catalog:
        if row["nation"].casefold() == key:
            return {"nation": row["nation"], "flag": row["flag"]}
    for row in catalog:
        short = row.get("short", "")
        if short and short.casefold() == key:
            return {"nation": row["nation"], "flag": row["flag"]}
    hits = [row for row in catalog if key in row["nation"].casefold()]
    if len(hits) == 1:
        return {"nation": hits[0]["nation"], "flag": hits[0]["flag"]}
    if hits:
        # Prefer the shortest title containing the token (e.g. "Aurora" → Aurora Union).
        hits.sort(key=lambda r: len(r["nation"]))
        return {"nation": hits[0]["nation"], "flag": hits[0]["flag"]}
    return {"nation": raw, "flag": ""}


def _attach_cooperated(aircraft: list[dict], domini: dict) -> None:
    catalog = _domini_country_index(domini)
    MEDIA_FLAGS.mkdir(parents=True, exist_ok=True)
    for a in aircraft:
        tokens = COOPERATED.get(a["id"]) or []
        rows: list[dict] = []
        seen: set[str] = set()
        primary = str(a.get("nation") or "").casefold()
        for token in tokens:
            resolved = _resolve_nation(token, catalog)
            name = resolved["nation"]
            name_key = name.casefold()
            if not name or name_key in seen or name_key == primary:
                continue
            seen.add(name_key)
            flag = resolved.get("flag") or ""
            # Domini load may already rewrite to media/flags/; otherwise copy from assets.
            if flag and not flag.startswith("media/"):
                src = NATIONS_DIR / flag
                if src.is_file():
                    shutil.copy2(src, MEDIA_FLAGS / flag)
                    flag = f"media/flags/{flag}"
                elif (MEDIA_FLAGS / Path(flag).name).is_file():
                    flag = f"media/flags/{Path(flag).name}"
                else:
                    flag = ""
            rows.append({"nation": name, "flag": flag})
        a["cooperated"] = rows


def parse_tres(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    out: dict = {"id": path.stem}
    for key in STR_KEYS:
        m = re.search(rf'^{key}\s*=\s*"(.*)"\s*$', text, re.M)
        if m:
            # Keep UTF-8 as-is; only unescape GDScript string escapes.
            out[key] = (
                m.group(1)
                .replace("\\\"", '"')
                .replace("\\n", "\n")
                .replace("\\\\", "\\")
            )
    for key in NUM_KEYS:
        m = re.search(rf"^{key}\s*=\s*([0-9.]+)\s*$", text, re.M)
        if m:
            raw = m.group(1)
            out[key] = float(raw) if "." in raw else int(raw)
    for key in BOOL_KEYS:
        m = re.search(rf"^{key}\s*=\s*(true|false)\s*$", text, re.M)
        if m:
            out[key] = m.group(1) == "true"
    flag = re.search(r'path="res://assets/nations/([^"]+)"', text)
    if flag:
        out["_flag_src"] = ROOT / "assets" / "nations" / flag.group(1)
        out["flag"] = f"media/flags/{flag.group(1)}"
    card = re.search(r'path="res://assets/ui/aircraft_cards/([^"]+)"', text)
    card_name = card.group(1) if card else f"{out['id']}.png"
    out["_card_src"] = ROOT / "assets" / "ui" / "aircraft_cards" / card_name
    out["card"] = f"media/cards/{card_name}"
    sw = re.search(r"starter_weapons\s*=\s*PackedStringArray\((.*)\)\s*$", text, re.M)
    if sw:
        out["starter_weapons"] = re.findall(r'"((?:\\.|[^"\\])*)"', sw.group(1))
    else:
        out["starter_weapons"] = []
    out.setdefault("category", "fixed_wing")
    out.setdefault("future_update", False)
    out.setdefault("variant_code", "")
    out.setdefault("lineage_family", "")
    out.setdefault("manufacturer", "")
    return out


def _copy_media(aircraft: list[dict]) -> tuple[int, int]:
    MEDIA_CARDS.mkdir(parents=True, exist_ok=True)
    MEDIA_FLAGS.mkdir(parents=True, exist_ok=True)
    cards = flags = 0
    for a in aircraft:
        src = a.pop("_card_src", None)
        if isinstance(src, Path) and src.is_file():
            shutil.copy2(src, MEDIA_CARDS / src.name)
            cards += 1
        elif isinstance(src, Path):
            a["card"] = ""
        src_f = a.pop("_flag_src", None)
        if isinstance(src_f, Path) and src_f.is_file():
            shutil.copy2(src_f, MEDIA_FLAGS / src_f.name)
            flags += 1
        elif isinstance(src_f, Path):
            a["flag"] = ""
    return cards, flags


def _load_domini() -> tuple[dict, int]:
    if not DOMINI_JSON.is_file():
        return {"world": {}, "continents": []}, 0
    raw = json.loads(DOMINI_JSON.read_text(encoding="utf-8"))
    continents: list[dict] = raw.get("continents", [])
    MEDIA_FLAGS.mkdir(parents=True, exist_ok=True)
    copied = 0
    for cont in continents:
        for country in cont.get("countries") or []:
            flag_name = str(country.get("flag", "")).strip()
            if not flag_name:
                country["flag"] = ""
                continue
            src = NATIONS_DIR / flag_name
            if src.is_file():
                shutil.copy2(src, MEDIA_FLAGS / flag_name)
                country["flag"] = f"media/flags/{flag_name}"
                copied += 1
            else:
                country["flag"] = ""
    return {"world": raw.get("world", {}), "continents": continents}, copied


def _resolve_news_art(post: dict) -> tuple[Path | None, str]:
    art = str(post.get("art", "")).strip()
    source = str(post.get("art_source", "campaign")).strip().lower()
    if not art:
        return CAMPAIGN_PLACEHOLDER if CAMPAIGN_PLACEHOLDER.is_file() else None, "campaign_placeholder.png"
    if source == "card":
        src = CARD_ART_DIR / art
        return (src, art) if src.is_file() else (None, art)
    if source == "news":
        src = NEWS_ART_DIR / art
        if src.is_file():
            return src, art
    src = CAMPAIGN_ART_DIR / art
    if src.is_file():
        return src, art
    if CAMPAIGN_PLACEHOLDER.is_file():
        return CAMPAIGN_PLACEHOLDER, "campaign_placeholder.png"
    return None, art


def _load_news() -> tuple[list[dict], int]:
    if not NEWS_JSON.is_file():
        return [], 0
    raw = json.loads(NEWS_JSON.read_text(encoding="utf-8"))
    posts: list[dict] = raw.get("posts", [])
    MEDIA_NEWS.mkdir(parents=True, exist_ok=True)
    copied = 0
    for post in posts:
        src, dest_name = _resolve_news_art(post)
        post.pop("art_source", None)
        if src and src.is_file():
            shutil.copy2(src, MEDIA_NEWS / dest_name)
            post["art"] = f"media/news/{dest_name}"
            copied += 1
        else:
            post["art"] = ""
    posts.sort(key=lambda p: str(p.get("date", "")), reverse=True)
    return posts, copied


def _load_campaigns() -> tuple[list[dict], int]:
    if not CAMPAIGNS_JSON.is_file():
        return [], 0
    raw = json.loads(CAMPAIGNS_JSON.read_text(encoding="utf-8"))
    campaigns: list[dict] = raw.get("campaigns", [])
    MEDIA_CAMPAIGNS.mkdir(parents=True, exist_ok=True)
    copied = 0
    for c in campaigns:
        art = str(c.get("art", "")).strip()
        src = CAMPAIGN_ART_DIR / art if art else CAMPAIGN_PLACEHOLDER
        if not src.is_file():
            src = CAMPAIGN_PLACEHOLDER
        if src.is_file():
            dest_name = art if art else "campaign_placeholder.png"
            shutil.copy2(src, MEDIA_CAMPAIGNS / dest_name)
            c["art"] = f"media/campaigns/{dest_name}"
            copied += 1
        else:
            c["art"] = ""
        missions = c.get("missions") or []
        c["mission_count"] = len(missions)
    return campaigns, copied


def _png_ihdr_size(path: Path) -> tuple[int, int] | None:
    """Read width×height from PNG IHDR without decoding pixels."""
    try:
        with path.open("rb") as fp:
            if fp.read(8) != b"\x89PNG\r\n\x1a\n":
                return None
            fp.read(4)  # chunk length
            if fp.read(4) != b"IHDR":
                return None
            w, h = struct.unpack(">II", fp.read(8))
            return w, h
    except OSError:
        return None


def _copy_domini_map() -> tuple[bool, str, list[int]]:
    """Build optimized equirectangular globe texture for the encyclopedia.

    Prefers `domini_map_wip_full.png` (e.g. 20000×10000) when present, otherwise
    uses `domini_map_wip.png`. Downscales large sources to DOMINI_WEB_W×H (2:1).
    Never upscales a tiny preview — that only invents blur.
    """
    MEDIA_DOMINI.mkdir(parents=True, exist_ok=True)
    src = DOMINI_MAP_FULL if DOMINI_MAP_FULL.is_file() else DOMINI_MAP_SRC
    if not src.is_file():
        return False, "missing", []

    dest = MEDIA_DOMINI / "domini_map_wip.png"
    try:
        from PIL import Image

        Image.MAX_IMAGE_PIXELS = None  # allow 20000×10000 source maps
        im = Image.open(src).convert("RGB")
        w, h = im.size

        # Tiny / already-small source: copy as-is (do not upscale).
        if w <= DOMINI_WEB_W and h <= DOMINI_WEB_H:
            shutil.copy2(src, dest)
        else:
            canvas = Image.new("RGB", (DOMINI_WEB_W, DOMINI_WEB_H), (0xC5, 0x82, 0x9B))
            fitted = im.copy()
            fitted.thumbnail((DOMINI_WEB_W, DOMINI_WEB_H), Image.Resampling.LANCZOS)
            ox = (DOMINI_WEB_W - fitted.size[0]) // 2
            oy = (DOMINI_WEB_H - fitted.size[1]) // 2
            canvas.paste(fitted, (ox, oy))
            canvas.save(dest, format="PNG", optimize=True)
            # Keep a matching optimized WIP next to the full source.
            canvas.save(DOMINI_MAP_SRC, format="PNG", optimize=True)

        dest_size = _png_ihdr_size(dest)
        if dest_size is None:
            return True, "unknown-size", []
        dw, dh = dest_size
        info = f"{w}x{h}->{dw}x{dh}" if (w, h) != (dw, dh) else f"{dw}x{dh}"
        return True, info, [dw, dh]
    except Exception as exc:  # noqa: BLE001 — fall back to raw copy
        print(f"Domini map optimize failed ({exc}); copying raw.")
        shutil.copy2(src, dest)
        dest_size = _png_ihdr_size(dest)
        if dest_size is None:
            return True, "raw-copy", []
        dw, dh = dest_size
        return True, f"raw-copy->{dw}x{dh}", [dw, dh]


def _build_id() -> str:
    """Unique per build so browsers cannot keep a stale data.js / card PNG."""
    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    try:
        sha = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if sha:
            return f"{sha}-{stamp}"
    except Exception:  # noqa: BLE001
        pass
    return stamp


def main() -> None:
    build_id = _build_id()
    aircraft = []
    for path in sorted(TRES_DIR.glob("*.tres")):
        if path.name == "aircraft_data.gd":
            continue
        aircraft.append(parse_tres(path))
    n_cards, n_flags = _copy_media(aircraft)
    campaigns, n_campaign_art = _load_campaigns()
    domini, n_domini_flags = _load_domini()
    _attach_cooperated(aircraft, domini)
    news, n_news_art = _load_news()
    has_domini_map, domini_map_info, globe_map_size = _copy_domini_map()
    payload = {
        "title": "Parabellum Encyclopedia",
        "subtitle": "encyclopedia.parabellumuniverse.com",
        "site": "https://encyclopedia.parabellumuniverse.com",
        "build_id": build_id,
        "air_eras": AIR_ERAS,
        "special_ids": SPECIAL_IDS,
        "heli_eras": HELI_ERAS,
        "aircraft": aircraft,
        "campaigns": campaigns,
        "domini": {
            **domini,
            "globe_map": "media/domini/domini_map_wip.png" if has_domini_map else "",
            "globe_map_wip": True,
            "globe_map_size": globe_map_size if has_domini_map else [],
        },
        "news": news,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    OUT.write_text(
        "/* Auto-generated by tools/build_encyclopedia.py — do not hand-edit. */\n"
        f"window.PB_ENCYCLOPEDIA = {body};\n",
        encoding="utf-8",
    )
    BUILD_JSON.write_text(
        json.dumps({"id": build_id}, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    n_continents = len(domini.get("continents") or [])
    print(
        f"Wrote {OUT} + {BUILD_JSON.name} id={build_id} "
        f"({len(aircraft)} airframes, {n_cards} cards, "
        f"{n_flags} flags, {len(campaigns)} campaigns, {n_campaign_art} campaign art, "
        f"{n_continents} continents, {n_domini_flags} domini flags, "
        f"{len(news)} news posts, {n_news_art} news art, "
        f"domini_map={domini_map_info})"
    )


if __name__ == "__main__":
    main()
