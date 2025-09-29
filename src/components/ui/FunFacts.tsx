// src/components/FunFacts.tsx
import { useState, useEffect } from "react";

const funFacts = [
  "The Argo program is named after the ship Argo from Greek mythology — companion to Jason and the Argonauts.",
  "Each Argo float drifts for about 10 days, then dives to 2,000 meters depth before resurfacing to transmit data via satellite.",
  "Argo floats are robotic oceanographers — they collect temperature, salinity, and sometimes oxygen, nitrate, and chlorophyll.",
  "Over 4,000 active floats are currently roaming the world’s oceans (and growing!).",
  "Combined, Argo floats cover more ocean area daily than all ships and research cruises put together.",
  "The Argo dataset is updated in near real-time — typically within 24 hours of a float surfacing.",
  "Floats last around 4–5 years, delivering hundreds of profiles in their lifetime.",
  "Data from Argo is stored in NetCDF format, making it compact and machine-readable.",
  "Argo floats are battery powered — and some use lithium packs the size of a soda can to survive for years.",
  "The Deep Argo mission extends float dives from 2,000 m to 6,000 m, covering the entire ocean depth.",
  "BGC (BioGeoChemical) Argo floats can measure pH, oxygen, nitrate, and even detect phytoplankton blooms.",
  "Argo floats communicate with satellites like Iridium — the same network that powers satellite phones.",
  "The program started in 2000 with just a few floats and is now a global network.",
  "On average, a float travels 200 km during its 10-day drift cycle.",
  "Argo has collected over 2 million vertical profiles, the largest single source of ocean climate data.",
  "This dataset is open and free — anyone can download and analyze it.",
  "Argo floats have revealed deep ocean warming, helping confirm human-driven climate change.",
  "The floats are designed to be biofouling resistant, so barnacles and algae don’t mess up the sensors.",
  "Each float costs about $20,000–30,000, far cheaper than running a research ship.",
  "Some floats are deployed from cargo ships, sailboats, and even airplanes.",
  "The Indian Ocean has fewer floats compared to the Pacific — a gap current projects are trying to fix.",
  "Floats can survive in ice-covered oceans, popping up in gaps between sea ice to transmit data.",
  "They drift at a depth called the “parking depth” (usually 1,000 m), then profile to 2,000 m.",
  "Argo data feeds directly into weather and climate models, improving monsoon and cyclone predictions.",
  "Fun twist: an Argo float once surfaced near a fisherman’s net, who thought he’d caught an alien robot!",
];

export default function FunFacts() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % funFacts.length);
    }, 5000); // rotate every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-[hsl(210_100%_5%)] rounded-xl p-6 max-w-3xl mx-auto shadow-lg -mt-6">
  <p className="text-lg sm:text-xl leading-relaxed text-blue-300 transition-opacity duration-700 ease-in-out pb-4">
    <span className="text-white font-bold pr-2">Fun Fact:</span>
    {funFacts[index]}
  </p>
</div>

  );
}
