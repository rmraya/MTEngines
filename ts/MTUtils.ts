/*******************************************************************************
 * Copyright (c) 2023 - 2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
import { TextNode, XMLElement, SAXParser, DOMBuilder } from "typesxml";

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
        return builder.getDocument().getRoot();
    }
}