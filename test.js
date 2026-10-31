const text = "## Header\nSpeaker: Hello there\n[System]: System message here";
const parts = text.split(/^([A-Z][a-zA-Z\s]+:|\s*\[.*?\]:|\s*#{1,6}\s+.*$)/gm);
console.log(parts);
