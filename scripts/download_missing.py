import urllib.request
import os

base_dir = r"C:\Users\Jack\Documents\antigravity\calm-curie\public\icons"
os.makedirs(base_dir, exist_ok=True)

downloads = {
    "Icon_HV_Equipment_BarbarianPuppet.png": "https://media.ffycdn.net/eu/supercell/z3vtbAFPDutkj2ms6iNM.png",
    "Icon_HV_Equipment_ArcherPuppet.png": "https://media.ffycdn.net/eu/supercell/G99Kon8fPwi9iwuqdSiz.png",
    "Icon_HV_Equipment_Vampstache.png": "https://media.ffycdn.net/eu/supercell/xVvwVgixdDVPX5Y5ajhT.png"
}

for name, url in downloads.items():
    path = os.path.join(base_dir, name)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
        out_file.write(response.read())
    print(f"Downloaded {name} successfully.")
