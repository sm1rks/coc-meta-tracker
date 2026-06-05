const base = import.meta.env.BASE_URL;
export const basePath = base.endsWith('/') ? base : base + '/';

export const getHeroIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_${name.replace(/\s+/g, '')}.png`;
export const getEqIcon = (str: string) => `${basePath}icons/Icon_HV_Equipment_${str.replace(/\s+/g, '')}.${str === 'Monolith Arrow' ? 'webp' : 'png'}`;
export const getPetIcon = (name: string) => `${basePath}icons/Icon_HV_Hero_Pets_${name.replace(/\s+/g, '_')}.png`;
export const getSuperTroopIcon = (name: string) => `${basePath}icons/Icon_HV_${name.replace(/\s+/g, '_')}.png`;
export const getSiegeMachineIcon = (name: string) => `${basePath}icons/Icon_HV_Siege_Machine_${name.replace(/ /g, '_')}.png`;
