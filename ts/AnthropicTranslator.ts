/*******************************************************************************
 * Copyright (c) 2023 - 2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse   License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import Anthropic from '@anthropic-ai/sdk';
import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { MTUtils } from "./MTUtils";

export class AnthropicTranslator implements MTEngine {

    // Claude 4 Models
    static readonly CLAUDE_OPUS_4: string = "claude-opus-4-0";
    static readonly CLAUDE_SONNET_4: string = "claude-sonnet-4-0";

    // Claude 3.7 Models

    static readonly CLAUDE_SONNET_3_7: string = "claude-3-7-sonnet-latest";

    // Claude 3.5 Models
    static readonly CLAUDE_HAIKU_3_5: string = "claude-3-5-haiku-latest";
    static readonly CLAUDE_SONNET_3_5: string = "claude-3-5-sonnet-latest";

    // Claude 3 Models
    static readonly CLAUDE_HAIKU_3_0: string = "claude-3-haiku-20240307";
    static readonly CLAUDE_SONNET_3_0: string = "claude-3-sonnet-20240229";
    static readonly CLAUDE_OPUS_3_0: string = "claude-3-opus-latest";

    model: string = AnthropicTranslator.CLAUDE_SONNET_3_5; // Default model
    anthropic: Anthropic;
    srcLang: string;
    tgtLang: string;

    constructor(apiKey: string, model?: string) {
        if (model) {
            this.model = model;
        }
        this.anthropic = new Anthropic({ apiKey: apiKey });
    }

    getName(): string {
        return 'Anthropic Claude';
    }

    getShortName(): string {
        return 'Anthropic';
    }

    getModels(): string[] {
        let models: string[] = [
            AnthropicTranslator.CLAUDE_OPUS_4,
            AnthropicTranslator.CLAUDE_SONNET_4,
            AnthropicTranslator.CLAUDE_SONNET_3_7,
            AnthropicTranslator.CLAUDE_SONNET_3_7,
            AnthropicTranslator.CLAUDE_HAIKU_3_5,
            AnthropicTranslator.CLAUDE_SONNET_3_5,
            AnthropicTranslator.CLAUDE_HAIKU_3_0,
            AnthropicTranslator.CLAUDE_SONNET_3_0,
            AnthropicTranslator.CLAUDE_OPUS_3_0
        ];
        models.sort((a: string, b: string) => {
            return a.localeCompare(b, 'en');
        });
        return models;
    }

    getSourceLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
    }

    setSourceLanguage(lang: string): void {
        this.srcLang = lang;
    }

    getSourceLanguage(): string {
        return this.srcLang;
    }

    setTargetLanguage(lang: string): void {
        this.tgtLang = lang;
    }

    getTargetLanguage(): string {
        return this.tgtLang;
    }

    translate(source: string): Promise<string> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);
        return new Promise<string>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text.trim();
                if (translation.startsWith('"""') && translation.endsWith('"""')) {
                    translation = translation.substring(3, translation.length - 3).trim();
                }
                resolve(translation);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement, terms: { source: string, target: string }[]): Promise<MTMatch> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);
        return new Promise<MTMatch>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text.trim();
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (translation.startsWith('```') && translation.endsWith('```')) {
                    translation = translation.substring(3, translation.length - 3).trim();
                }
                let target: XMLElement = MTUtils.toXMLElement(translation);
                if (source.hasAttribute('xml:space')) {
                    target.setAttribute(source.getAttribute('xml:space'));
                }
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    async createMessage(source: string): Promise<Anthropic.Message> {
        return await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: "user", content: source }],
        });
    }

    handlesTags(): boolean {
        return true;
    }

    fixesMatches(): boolean {
        return true;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);
        return new Promise<MTMatch>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text;
                let target: XMLElement = MTUtils.toXMLElement(translation);
                if (originalSource.hasAttribute('xml:space')) {
                    target.setAttribute(originalSource.getAttribute('xml:space'));
                }
                resolve(new MTMatch(originalSource, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        let propmt: string = MTUtils.getRole(this.srcLang, this.tgtLang) + ' ' + MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);
        return new Promise<XMLElement>((resolve, reject) => {
            this.createMessage(propmt).then((message: Anthropic.Message) => {
                let jsonString: string = JSON.stringify(message, null, 2);
                let jsonObject: any = JSON.parse(jsonString);
                let translation: string = jsonObject.content[0].text;
                let target: XMLElement = MTUtils.toXMLElement(translation);
                if (source.hasAttribute('xml:space')) {
                    target.setAttribute(source.getAttribute('xml:space'));
                }
                resolve(target);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }
}