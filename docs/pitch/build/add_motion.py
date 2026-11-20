"""Add Morph transitions and automatic entrance animations to a deck written by pptxgenjs.

- Every slide gets a Morph transition (fallback: fade for software without Morph). Objects named "!!…" on two slides
  are paired by Morph (sky, veil, the three orbs), so they glide from one slide to the next like the website's scroll.
- Every shape named "@N …" fades in automatically after the transition, in the order N (N × 0.22 s), with no click.

Usage: python -I docs/pitch/build/add_motion.py <deck.pptx>   (rewrites the file in place)
"""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

MORPH = (
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
    '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
    '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="1400">'
    '<p159:morph option="byObject"/></p:transition></mc:Choice>'
    '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
)
SHAPE = re.compile(r'<p:cNvPr id="(\d+)" name="@(\d+)[^"]*"')
STEP_MS = 220
FIRST_MS = 250
FADE_MS = 550


def effect(ctn: int, spid: str, delay: int) -> tuple[str, int]:
    """One fade-in entrance, 'with previous', starting after `delay` ms. Returns (xml, next free cTn id)."""
    xml = (
        f'<p:par><p:cTn id="{ctn}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" nodeType="withEffect">'
        f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
        f'<p:set><p:cBhvr><p:cTn id="{ctn + 1}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
        f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>'
        f'</p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>'
        f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{ctn + 2}" dur="{FADE_MS}"/>'
        f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
        f"</p:childTnLst></p:cTn></p:par>"
    )
    return xml, ctn + 3


def timing(shapes: list[tuple[str, int]]) -> str:
    if not shapes:
        return ""
    ctn = 5
    parts = []
    for spid, order in shapes:
        xml, ctn = effect(ctn, spid, FIRST_MS + order * STEP_MS)
        parts.append(xml)
    return (
        '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
        '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
        '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
        '<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        + "".join(parts)
        + "</p:childTnLst></p:cTn></p:par>"
        "</p:childTnLst></p:cTn></p:par>"
        "</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt=\"onPrev\" delay=\"0\"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>"
        "<p:nextCondLst><p:cond evt=\"onNext\" delay=\"0\"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>"
        "</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>"
    )


def process_slide(xml: str) -> str:
    xml = re.sub(r"<p:transition\b.*?</p:transition>", "", xml, flags=re.S)
    xml = re.sub(r"<p:timing>.*?</p:timing>", "", xml, flags=re.S)
    shapes = [(m.group(1), int(m.group(2))) for m in SHAPE.finditer(xml)]
    insert = MORPH + timing(shapes)
    anchor = "</p:clrMapOvr>"
    if anchor in xml:
        return xml.replace(anchor, anchor + insert, 1)
    return xml.replace("</p:sld>", insert + "</p:sld>", 1)


def main(path: Path) -> None:
    tmp = Path(tempfile.mkdtemp()) / path.name
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
                data = process_slide(data.decode("utf-8")).encode("utf-8")
            zout.writestr(item, data)
    shutil.move(str(tmp), path)
    print(f"motion added: {path}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
