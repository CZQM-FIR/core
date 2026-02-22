import type { Transport } from '@sveltejs/kit';
import { sharedTransport } from '@czqm/common';

export const transport: Transport = sharedTransport;
