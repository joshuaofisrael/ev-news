---
title: "Sample draft: how a Charging post cites its sources"
date: 2026-10-21
updatedAt: 2026-10-21
category: Charging
summary: "Unpublished template for the Charging desk. It shows the byline, tags, inline links, and required sources list. It is not a news report."
tags:
  - sample
  - template
draft: true
sample: true
# Photoreal slot. Add src/assets/images/sample-charging-hero.webp and .avif. Do not use a drawing.
hero:
  src: sample-charging-hero
  alt: "Unbranded home wall charger and a coiled cable on a garage wall, with no people and no readable brand names"
  width: 1200
  height: 675
images:
  - src: sample-charging-stall
    alt: "One empty public charging stall in a small parking lot, with no brand names and no vehicles"
    after: 2
    width: 1200
    height: 675
  - src: sample-charging-plug
    alt: "Generic charging connector seated in a car port, with the cable leaving the frame and no hands visible"
    after: 4
    width: 1200
    height: 675
sources:
  - title: "Alternative Fuels Data Center: Electricity"
    url: "https://afdc.energy.gov/fuels/electricity"
    publisher: "U.S. Department of Energy, Alternative Fuels Data Center"
    date: 2026-10-22
  - title: "Alternative Fuels Data Center: Electric Vehicle Research and Development"
    url: "https://afdc.energy.gov/fuels/electricity-research"
    publisher: "U.S. Department of Energy, Alternative Fuels Data Center"
    date: 2026-10-22
  - title: "Electric Vehicle Myths"
    url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths"
    publisher: "U.S. Environmental Protection Agency"
    date: 2026-06-10
---

This file is an unpublished sample for the Charging desk. It is not a report about a charging network, a price, a connector rule, or an outage.

Use the shape, not the subject, when you file the daily post. Keep `draft: true` until the source list is complete and each fact in the body has an inline link. The production site does not include this page. It is also marked `sample: true`, so removing the draft flag alone will still fail the build.

## How an inline citation is written

Name the public page in the sentence that depends on it. The page to cite for the Alternative Fuels Data Center electricity reference is the [Alternative Fuels Data Center electricity page](https://afdc.energy.gov/fuels/electricity). The center also publishes an [electric vehicle research and development page](https://afdc.energy.gov/fuels/electricity-research). When this draft was prepared, neither page displayed a publication date, so those source dates are the access date, 22 October 2026.

The U.S. Environmental Protection Agency page [Electric Vehicle Myths](https://www.epa.gov/greenvehicles/electric-vehicle-myths) does display a last-updated date. The page says June 10, 2026, and that is the date in the source list.

A Charging story that cites a number, a map, or a quote needs that number, map, or quote to appear in one of the linked sources. This sample does not add any.
