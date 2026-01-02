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
import { Language, LanguageUtils } from "typesbcp47";
import { DOMBuilder, SAXParser, TextNode, XMLDocument, XMLElement } from "typesxml";

export class MTUtils {

    static getElementContent(e: XMLElement): string {
        let content: string = '';
        for (let node of e.getContent()) {
            content += node.toString();
        }
        return content;
    }

    static plainText(e: XMLElement): string {
        let text: string = '';
        for (let node of e.getContent()) {
            if (node instanceof XMLElement) {
                text += node.getText();
            } else if (node instanceof TextNode) {
                text += node.toString();
            }
        }
        return text;
    }

    static toXMLElement(text: string): XMLElement {
        let parser: SAXParser = new SAXParser();
        let builder: DOMBuilder = new DOMBuilder();
        parser.setContentHandler(builder);
        parser.parseString(text);
        let document: XMLDocument | undefined = builder.getDocument();
        if (document) {
            let root: XMLElement | undefined = document.getRoot();
            if (root) {
                return root;
            }
        }
        throw new Error('Could not parse XML element from text: ' + text);
    }

    static getRole(srcLang: string, tgtLang: string): string {
        let srcLanguage: Language | undefined = LanguageUtils.getLanguage(srcLang, 'en');
        if (!srcLanguage) {
            throw new Error('Language not found for code: ' + srcLang);
        }
        let tgtLanguage: Language | undefined = LanguageUtils.getLanguage(tgtLang, 'en');
        if (!tgtLanguage) {
            throw new Error('Language not found for code: ' + tgtLang);
        }
        return 'You are an expert translator from ' + srcLanguage.description + ' to ' + tgtLanguage.description + ' with expert knowledge of XLIFF 2.1 formatting and best practices.';
    }

    static translatePropmt(source: string, srcLang: string, tgtLang: string): string {
        let sourceLanguage: Language | undefined = LanguageUtils.getLanguage(srcLang, 'en');
        if (!sourceLanguage) {
            throw new Error('Language not found for code: ' + srcLang);
        }
        let targetLanguage: Language | undefined = LanguageUtils.getLanguage(tgtLang, 'en');
        if (!targetLanguage) {
            throw new Error('Language not found for code: ' + tgtLang);
        }
        return 'Accurately translate the text enclosed in triple quotes from ' +
            sourceLanguage.description + ' to ' + targetLanguage.description +
            ' preserving the meaning, tone, and nuance of the original text.\n\n """' + source +
            '""" \n\n Provide only the requested translation without any additional commentary or explanation.';;
    }

    static generatePrompt(source: XMLElement, srcLang: string, tgtLang: string, terms: { source: string, target: string }[]): string {
        let sourceLanguage: Language | undefined = LanguageUtils.getLanguage(srcLang, 'en');
        if (!sourceLanguage) {
            throw new Error('Language not found for code: ' + srcLang);
        }
        let targetLanguage: Language | undefined = LanguageUtils.getLanguage(tgtLang, 'en');
        if (!targetLanguage) {
            throw new Error('Language not found for code: ' + tgtLang);
        }
        let propmt: string = 'Your task is to translate an XLIFF 2.1 `<source>` XML element into a `<target>` XML element.\n\n' +
            'Given the following `<source>` XML element:\n\n```xml\n' +
            source.toString() + '\n```\n\n' +
            'Translate the content of the `<source>` element from ' + sourceLanguage.description +
            ' into ' + targetLanguage.description +
            '.\n\nRequirements:\n\n' +
            '1. Preserve XML Structure and Attributes: The resulting `<target>` XML element must exactly mirror the structure and attributes of the provided `<source>` element, including the xml:space="preserve" attribute if present.\n' +
            '2. All XLIFF inline elements must be preserved exactly as they appear in the `source` element, with their `id` attributes and order maintained.\n' +
            '3. Accurate and Nuanced Translation: The ' + targetLanguage.description + ' translation must preserve the original meaning, tone, and nuance.\n' +
            (terms.length > 0 ? '4. Apply Terminology Mapping: Use the following term mapping, making appropriate gender and pluralization adjustments:\n\n```json\n' +
                JSON.stringify(terms, null, 2) + '\n```\n\n' : '\n') +

            'Output:\n\n' +
            'Provide only the complete `<target>` XML element. Do not include any surrounding XML, additional commentary, or explanations.\n\n' +
            'Expected Output Format:\n\n```xml\n' +
            '<target xml:space="preserve"> ... </target>\n```';
        return propmt;
    }

    static fixTagsPrompt(source: XMLElement, target: XMLElement, srcLang: string, tgtLang: string): string {
        let lang: string = tgtLang.indexOf('-') > 0 ? tgtLang.substring(0, tgtLang.indexOf('-')) : tgtLang;
        let language: Language | undefined = LanguageUtils.getLanguage(lang, 'en');
        if (!language) {
            throw new Error('Language not found for code: ' + lang);
        }
        let tgetLanguage: string = language.description;
        return 'Given the following `<source>` and `<target>` XML elements from an XLIFF 2.1 document:\n\n```xml\n' +

            source.toString() + '\n' +
            target.toString() + '\n```\n\n' +

            'The `<target>` element is missing required inline elements.\n' +

            'Your task is to revise the `<target>` so that:\n' +
            '	•	All inline elements from the `<source>` appear in the corrected `<target>`, in the appropriate grammatical and semantic positions for accurate' + tgetLanguage + '.\n' +
            '	•	The translation remains fluent and faithful to the source meaning.\n' +
            '	•	Do not add, omit, or reorder any inline elements.\n' +
            '	•	Do not change the ' + lang + ' text.\n' +
            '	•	Do not include any explanation or comments, return only the corrected `<target>` element.\n' +

            'Provide only the corrected `<target>` element in your response.\n';
    }

    static fixMatchPrompt(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): string {
        return 'The following "Target XML" is the translation of "Source XML".\n\n' +

            'Target XML: ' + matchTarget.toString() + `\n` +
            'Source XML: ' + matchSource.toString() + '\n\n' +

            'The following "New XML" is similar to "Source XML".\n\n' +

            'New XML: ' + originalSource.toString() + '\n\n' +

            'Translate the content of "New XML" so that the translation is phrased similarly to the content of "Target XML" but is an accurate translation of "New XML".\n' +
            'Provide only the requested translation in the same XML format as "Target XML" and do not add any additional text. Make sure the translation is valid XML and does not contain any XML errors.';
    }

    static getLanguages(): Promise<string[]> {
        // AI tools should support any language, but we'll limit them to 
        // the common ones supported by the TypesBCP47 library
        return new Promise<string[]>((resolve, reject) => {
            try {
                let languages: Language[] = LanguageUtils.getCommonLanguages('en');
                let result: string[] = [];
                for (let language of languages) {
                    result.push(language.code);
                }
                resolve(result);
            } catch (error) {
                if (error instanceof Error) {
                    reject(error);
                    return;
                }
                reject(error as Error);
            }
        });
    }
}