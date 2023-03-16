import { SyncCode, ZipParser } from "./sync-code.interface";
import { Preferences } from "./preferences.interfaces";

export interface APPData {
  syncCode: SyncCode,
  zipParser: ZipParser,
  preferences: Preferences,
}