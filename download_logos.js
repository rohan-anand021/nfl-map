const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

// Updated list of logos with official, stable NFL URLs
const logos = [
  {
    filename: "ARI.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/u9fltoslqdsyao8cpm0k",
  },
  {
    filename: "ATL.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/d8m7hzpsbrl6e5sfyocx",
  },
  {
    filename: "BAL.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ucsdijmddsqcj1i9tddd",
  },
  {
    filename: "BUF.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/giphcy6xbljptnfwhjra",
  },
  {
    filename: "CAR.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ervfzgrqdpqaqvci8Foj",
  },
  {
    filename: "CHI.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ra0po5oK3av4T038pTRs",
  },
  {
    filename: "CIN.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ok2n9kdaIStLgxhTf609",
  },
  {
    filename: "CLE.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/fACf3vFflh3iTj01a3RU",
  },
  {
    filename: "DAL.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ieYUp34eA2y2jAklc2Iu",
  },
  {
    filename: "DEN.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/t0p7m5cjdjxyADmMb7ga",
  },
  {
    filename: "DET.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ocvfdLGUb4y03y223xek",
  },
  {
    filename: "GB.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/gVfI0ALkkl3q0znc6t0s",
  },
  {
    filename: "HOU.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/h3u6tphvx0bJFS45porp",
  },
  {
    filename: "IND.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/cHxP42I4D42s18sAcOfl",
  },
  {
    filename: "JAX.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/qWfLKIiGprY4R2w5e3t9",
  },
  {
    filename: "KC.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/f2w0gajLOKBfR2P3lCBA",
  },
  {
    filename: "LV.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/gzcojbz2illn332s6m3h",
  },
  {
    filename: "LAC.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/dhvwmj8sD3B0JPsG6t4E",
  },
  {
    filename: "LAR.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/ayvwcmlO2D2iA2sWZt2N",
  },
  {
    filename: "MIA.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/xP33sTcLmX1i3401tW2n",
  },
  {
    filename: "MIN.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/yCxFJdlzSkdo8aEMV82A",
  },
  {
    filename: "NE.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/jzhSENxD2O3D24EO2pxz",
  },
  {
    filename: "NO.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/grhjkahghjkk1ALq4t3s",
  },
  {
    filename: "NYG.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/t6mhdmg3d1hL8kO40a5G",
  },
  {
    filename: "NYJ.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/aKb2Hj8THh3Q6iAn18r3",
  },
  {
    filename: "PHI.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/pC8rTjdTeN0c2sA71xOd",
  },
  {
    filename: "PIT.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/urtqZZzlgv3TujN06k1s",
  },
  {
    filename: "SF.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/P4962TbdIKEI1cQTvI1E",
  },
  {
    filename: "SEA.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/cE0c5F1gV2Y3i2hRA3R3",
  },
  {
    filename: "TB.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/S8nB7a32CFVdJAUWb7pC",
  },
  {
    filename: "TEN.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/kvf22gsgqbWoYtrSUKEa",
  },
  {
    filename: "WAS.png",
    url: "https://static.www.nfl.com/image/private/f_auto/league/j55lE20dI2AStM6fJSt2",
  },
];

// The directory where logos will be saved
const outputDir = path.join(__dirname, "public", "logos");

async function downloadLogos() {
  try {
    // 1. Create the 'public/logos' directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Successfully created directory: ${outputDir}`);

    // 2. Download each logo
    for (const logo of logos) {
      const outputPath = path.join(outputDir, logo.filename);

      // Fetch the image data
      const response = await axios({
        method: "GET",
        url: logo.url,
        responseType: "arraybuffer", // Important for handling image data
      });

      // Save the image data to a file
      await fs.writeFile(outputPath, response.data);
      console.log(`✅ Downloaded ${logo.filename}`);
    }

    console.log("\nAll logos downloaded successfully! 🎉");
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

// Run the download function
downloadLogos();
