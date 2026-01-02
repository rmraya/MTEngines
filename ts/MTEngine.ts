/*******************************************************************************
 * Copyright (c) 2023-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { XMLElement } from "typesxml";
import { MTMatch } from "./MTMatch.js";

export interface MTEngine {

    getName(): string;
    getShortName(): string;
    getSourceLanguages(): Promise<string[]>;
    getTargetLanguages(): Promise<string[]>;
    setSourceLanguage(lang: string): void;
    getSourceLanguage(): string;
    setTargetLanguage(lang: string): void;
    getTargetLanguage(): string;
    translate(source: string): Promise<string>;
    getMTMatch(source: XMLElement, terms: { source: string, target: string }[]): Promise<MTMatch>;
    handlesTags(): boolean;
    fixesMatches(): boolean;
    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch>;
    fixesTags(): boolean;
    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement>;
}