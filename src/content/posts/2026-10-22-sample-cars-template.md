---
title: "Sample draft: how a Cars post cites its sources"
date: 2026-10-22
updatedAt: 2026-10-22
category: Cars
summary: "Unpublished template for the Cars desk. It shows the byline, tags, inline links, and required sources list. It is not a news report."
tags:
  - sample
  - template
draft: true
sample: true
sources:
  - title: "All-Electric Vehicles"
    url: "https://www.fueleconomy.gov/feg/evtech.shtml"
    publisher: "FuelEconomy.gov, administered by Oak Ridge National Laboratory for the U.S. Department of Energy and the U.S. Environmental Protection Agency"
    date: 2026-10-22
  - title: "Alternative Fuels Data Center: Electric Vehicles"
    url: "https://afdc.energy.gov/vehicles/electric"
    publisher: "U.S. Department of Energy, Alternative Fuels Data Center"
    date: 2026-10-22
  - title: "Electric & Plug-In Hybrid Electric Vehicles"
    url: "https://www.epa.gov/greenvehicles/explaining-electric-plug-hybrid-electric-vehicles"
    publisher: "U.S. Environmental Protection Agency"
    date: 2026-08-06
---

This file is an unpublished sample. It shows the article template for the Cars desk. It does not report a launch, a price, a recall, or a test result.

The production build omits every post with `draft: true`. Delete that line only when a real story is ready. The build then requires a non-empty `sources` list. Each source needs a title, an absolute http or https URL, a publisher, and a date. This file also has `sample: true`, so the build keeps refusing it until that flag is gone. Write a new file for a real story. Do not publish this one.

## How an inline citation is written

Link the phrase you are relying on, in the sentence it supports. A reference page titled All-Electric Vehicles is the [FuelEconomy.gov overview of all-electric vehicles](https://www.fueleconomy.gov/feg/evtech.shtml). The page footer says the site is administered by Oak Ridge National Laboratory for the U.S. Department of Energy and the U.S. Environmental Protection Agency. When this draft was prepared, the page did not display a publication date, so the matching source entry uses 22 October 2026, the day this draft recorded the URL.

The [Alternative Fuels Data Center page on electric vehicles](https://afdc.energy.gov/vehicles/electric) is the same kind of reference. Its footer says the center is a resource of the U.S. Department of Energy's Transportation Technologies Office. When this draft was prepared, that page did not display a publication date, so its source date is the access date.

When the publisher prints its own date, copy that. The U.S. Environmental Protection Agency page [Electric and Plug-In Hybrid Electric Vehicles](https://www.epa.gov/greenvehicles/explaining-electric-plug-hybrid-electric-vehicles) says it was last updated on August 6, 2026. That date is the one in the source list.

Do not add a figure, a quote, or a date that you cannot point to in one of these sources.
