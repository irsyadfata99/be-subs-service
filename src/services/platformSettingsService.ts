import db from "../../models";

const { PlatformSetting } = db;

export class PlatformSettingsService {
  async getSetting(key: string): Promise<string> {
    const setting = await PlatformSetting.findOne({ where: { key } });
    if (!setting) {
      if (key === "price_per_user") return "3000";
      throw new Error(`Setting ${key} not found`);
    }
    return setting.value;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const setting = await PlatformSetting.findOne({ where: { key } });
    if (setting) {
      await setting.update({ value });
    } else {
      await PlatformSetting.create({ key, value });
    }
  }

  async getPricePerUser(): Promise<number> {
    const value = await this.getSetting("price_per_user");
    return parseFloat(value);
  }
}
