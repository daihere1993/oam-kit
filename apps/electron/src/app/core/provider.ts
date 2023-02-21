import { AppProviderMetatype } from "./interfaces/provider-metatype.interface";

export class Provider {
  public instance: object;

  constructor(public metatype: AppProviderMetatype) {}
}