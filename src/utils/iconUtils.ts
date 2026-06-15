const base = import.meta.env.BASE_URL;
export const basePath = base.endsWith('/') ? base : base + '/';

export const getHeroIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_${name.replace(/\s+/g, '')}.webp`;
export const getEqIcon = (str: string) => `${basePath}icons/Icon_HV_Equipment_${str.replace(/\s+/g, '')}.webp`;
export const getPetIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_Pets_${name.replace(/\s+/g, '_')}.webp`;
export const getSuperTroopIcon = (name: string) => `${basePath}icons/Icon_HV_${name.replace(/\s+/g, '_')}.webp`;
export const getSiegeMachineIcon = (name: string) => `${basePath}icons/Icon_HV_Siege_Machine_${name.replace(/ /g, '_')}.webp`;

// Standard troop and spell icon helpers
export const getTroopIcon = (name: string) => `${basePath}icons/Icon_HV_${name.replace(/\s+/g, '_')}.webp`;
export const getSpellIcon = (name: string) => {
  const cleanName = name.replace(/\s*Spell$/, '').replace(/\s+/g, '_');
  return `${basePath}icons/Icon_HV_Spell_${cleanName}.webp`;
};
