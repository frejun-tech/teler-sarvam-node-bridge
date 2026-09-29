import { Client } from "@frejun/teler";
import { config } from "../core/config";

export const telerClient = new Client(config.telerKey);