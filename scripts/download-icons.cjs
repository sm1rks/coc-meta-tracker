const fs = require('fs');
const path = require('path');
const https = require('https');

const icons = {
    "Icon_HV_Super_Wall_Breaker.png": "https://media.ffycdn.net/eu/supercell/K4Xy9E6JGS97pEmjW5Zg.png",
    "Icon_HV_Super_Bowler.png": "https://media.ffycdn.net/eu/supercell/aZRsqhEddFshCNfAK3aY.png",
    "Icon_HV_Rocket_Balloon.png": "https://media.ffycdn.net/eu/supercell/g6QziotRcjUNUxvMHZV7.png",
    "Icon_HV_Inferno_Dragon.png": "https://media.ffycdn.net/eu/supercell/pz99yTXw9Huk8nP2nNwd.png",
    "Icon_HV_Ice_Hound.png": "https://media.ffycdn.net/eu/supercell/xb6nqv8XbUu79MpXFPZL.png",
    "Icon_HV_Super_Barbarian.png": "https://media.ffycdn.net/eu/supercell/DNQsYSmnJyrAWUs94R9u.png",
    "Icon_HV_Super_Yeti.png": "https://media.ffycdn.net/eu/supercell/ogJSUELHtKejK7H4bXvN.png",
    "Icon_HV_Sneaky_Goblin.png": "https://media.ffycdn.net/eu/supercell/jGf61igT3J4ih9ZDnRJv.png",
    "Icon_HV_Super_Miner.png": "https://media.ffycdn.net/eu/supercell/TMAJaA3eLtAKjeXWE2bx.png",
    "Icon_HV_Super_Dragon.png": "https://media.ffycdn.net/eu/supercell/QvaLPqVfpaz9UNLhgyxZ.png",
    "Icon_HV_Super_Archer.png": "https://media.ffycdn.net/eu/supercell/yCP1MLapC9jztHk4dCwe.png",
    "Icon_HV_Super_Giant.png": "https://media.ffycdn.net/eu/supercell/dHLynvZyqivrWvszfy1Z.png",
    "Icon_HV_Super_Minion.png": "https://media.ffycdn.net/eu/supercell/E5okjgYU4tyU3V6u2i4H.png",
    "Icon_HV_Super_Valkyrie.png": "https://media.ffycdn.net/eu/supercell/Az3mdVzBVcVy7Rpq192c.png",
    "Icon_HV_Super_Witch.png": "https://media.ffycdn.net/eu/supercell/RP1z2bJLyqagvUuQQKsV.png",
    "Icon_HV_Super_Hog_Rider.png": "https://media.ffycdn.net/eu/supercell/voMwZFpRprFQ9GRR5WpY.png"
};

const output_dir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(output_dir)) fs.mkdirSync(output_dir, { recursive: true });

Object.entries(icons).forEach(([name, url]) => {
    https.get(url, (res) => {
        const file = fs.createWriteStream(path.join(output_dir, name));
        res.pipe(file);
        file.on('finish', () => { file.close(); console.log(`Downloaded: ${name}`); });
    }).on('error', (e) => console.error(e));
});
