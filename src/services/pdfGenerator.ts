import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Screenplay, ScreenplayScene, ScreenplayElement } from '../types';

/**
 * Screenplay Layout Block definition for vertical space calculation & pagination
 */
interface LayoutBlock {
  type: 'header' | 'scene_heading' | 'action' | 'dialogue_block' | 'transition' | 'note';
  html: string;
  sceneIndex: number;
  elementIndex?: number;
  minHeightPx?: number; // Pre-calculated or estimated minimum height
  cannotBeAtPageBottom?: boolean; // True for scene headings and character names
  isDialogueBlock?: boolean;
}

/**
 * Professional A4 Screenplay PDF Generator
 * - Exact ISO A4 dimensions: 210mm x 297mm
 * - Professional screenplay margins: Top 20mm, Bottom 20mm, Left 25mm, Right 20mm
 * - Printable Area: 165mm width x 257mm height
 * - Automated Page Break calculation with Widow/Orphan protection
 * - Atomic Dialogue blocks (Character Name + Parenthetical + Dialogue kept together)
 * - Scene Heading protection (Never orphaned at page bottom)
 * - Transitions protection (Never stranded at page bottom)
 * - Page Numbering on page 2+
 * - Full Unicode font support for Tamil, Tanglish, and English
 */
export async function downloadScreenplayPDF(script: Screenplay): Promise<void> {
  // 1. Ensure all custom fonts (Courier Prime, Noto Sans Tamil, Mukta Malar, etc.) are loaded
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font loading check fails
    }
  }

  // 2. Constants for A4 dimensions at 96 DPI CSS scale
  // 1mm = 3.7795275591 px
  // 210mm = 793.7px -> ~794px
  // 297mm = 1122.5px -> ~1123px
  // Left margin: 25mm (~94.5px), Right margin: 20mm (~75.6px) -> Width: 165mm (~623.6px)
  // Top margin: 20mm (~75.6px), Bottom margin: 20mm (~75.6px) -> Height: 257mm (~971.3px)
  const PAGE_WIDTH_MM = 210;
  const PAGE_HEIGHT_MM = 297;
  const MARGIN_TOP_MM = 20;
  const MARGIN_BOTTOM_MM = 20;
  const MARGIN_LEFT_MM = 25;
  const MARGIN_RIGHT_MM = 20;

  const PAGE_WIDTH_PX = 794;
  const PAGE_HEIGHT_PX = 1123;
  const PRINTABLE_WIDTH_PX = 624; // 794 - (94.5 + 75.6)
  const PRINTABLE_HEIGHT_PX = 971; // 1123 - (75.6 + 75.6)

  const UNICODE_SCREENPLAY_FONT_STACK = "'Courier Prime', 'Noto Sans Tamil', 'Mukta Malar', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Malayalam', 'Noto Sans Kannada', 'Noto Sans Bengali', 'Noto Sans Arabic', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'Noto Sans', 'Segoe UI', Arial, 'Arial Unicode MS', Courier, monospace";

  // 3. Create Hidden Staging Container for accurate DOM layout & measurement
  const stagingWrapper = document.createElement('div');
  stagingWrapper.style.position = 'fixed';
  stagingWrapper.style.left = '-10000px';
  stagingWrapper.style.top = '0';
  stagingWrapper.style.width = `${PAGE_WIDTH_PX}px`;
  stagingWrapper.style.backgroundColor = '#FFFFFF';
  stagingWrapper.style.color = '#000000';
  stagingWrapper.style.fontFamily = UNICODE_SCREENPLAY_FONT_STACK;
  stagingWrapper.style.fontSize = '12pt';
  stagingWrapper.style.lineHeight = '1.45';
  stagingWrapper.style.boxSizing = 'border-box';
  stagingWrapper.style.zIndex = '-9999';
  document.body.appendChild(stagingWrapper);

  // Hidden measuring container matching exact printable width
  const measureBox = document.createElement('div');
  measureBox.style.width = `${PRINTABLE_WIDTH_PX}px`;
  measureBox.style.padding = '0';
  measureBox.style.margin = '0';
  measureBox.style.boxSizing = 'border-box';
  measureBox.style.fontFamily = UNICODE_SCREENPLAY_FONT_STACK;
  measureBox.style.fontSize = '12pt';
  measureBox.style.lineHeight = '1.45';
  stagingWrapper.appendChild(measureBox);

  try {
    // 4. Build Structured Layout Blocks
    const layoutBlocks: LayoutBlock[] = [];

    // Title / Header Block (Page 1 Opening)
    const headerHtml = `
      <div class="screenplay-title-block" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #111111;">
        <h1 style="font-size: 20pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0; font-family: inherit; color: #000000; line-height: 1.2;">
          ${escapeHtml(script.title || 'UNTITLED SCREENPLAY')}
        </h1>
        <p style="font-size: 10.5pt; font-style: italic; color: #333333; margin: 0 0 12px 0; line-height: 1.4; padding: 0 20px;">
          "${escapeHtml(script.oneLineConcept || '')}"
        </p>
        <div style="font-size: 9.5pt; color: #555555; display: flex; justify-content: space-between; border-top: 1px dashed #cccccc; padding-top: 8px; margin-top: 8px;">
          <span><strong>GENRE:</strong> ${escapeHtml(script.genre || 'DRAMA').toUpperCase()}</span>
          <span><strong>LANGUAGE:</strong> ${escapeHtml(script.detectedLanguage || 'TAMIL').toUpperCase()}</span>
          <span><strong>DATE:</strong> ${new Date(script.updatedAt || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>
    `;
    layoutBlocks.push({
      type: 'header',
      html: headerHtml,
      sceneIndex: -1,
    });

    // Process each Scene and its elements
    script.scenes.forEach((scene, sIdx) => {
      // Scene Heading Block
      const headingHtml = `
        <div class="screenplay-scene-heading" style="font-weight: 700; text-transform: uppercase; font-size: 12pt; margin-top: 18px; margin-bottom: 10px; background-color: #f4f4f4; padding: 4px 8px; border-left: 4px solid #000000; color: #000000; letter-spacing: 0.5px;">
          ${sIdx + 1}. ${escapeHtml(scene.heading)}
        </div>
      `;
      layoutBlocks.push({
        type: 'scene_heading',
        html: headingHtml,
        sceneIndex: sIdx,
        cannotBeAtPageBottom: true, // Needs at least 1 following element
      });

      // Group elements into logical blocks (combining Character + Parenthetical + Dialogue into atomic blocks)
      let eIdx = 0;
      while (eIdx < scene.elements.length) {
        const elem = scene.elements[eIdx];

        if (elem.type === 'scene_heading') {
          layoutBlocks.push({
            type: 'scene_heading',
            html: `<div style="font-weight: 700; text-transform: uppercase; font-size: 12pt; margin-top: 16px; margin-bottom: 8px; color: #000000;">${escapeHtml(elem.content)}</div>`,
            sceneIndex: sIdx,
            elementIndex: eIdx,
            cannotBeAtPageBottom: true,
          });
          eIdx++;
        } else if (elem.type === 'action') {
          // Action Paragraph
          const actionHtml = `
            <div class="screenplay-action" style="font-size: 12pt; line-height: 1.45; margin-bottom: 12px; text-align: left; color: #111111;">
              ${escapeHtml(elem.content)}
            </div>
          `;
          layoutBlocks.push({
            type: 'action',
            html: actionHtml,
            sceneIndex: sIdx,
            elementIndex: eIdx,
          });
          eIdx++;
        } else if (elem.type === 'character') {
          // Check for subsequent parenthetical & dialogue to build an atomic dialogue block
          let charName = elem.content;
          let parenthetical = '';
          let dialogue = '';
          let consumedCount = 1;

          if (eIdx + 1 < scene.elements.length && scene.elements[eIdx + 1].type === 'parenthetical') {
            parenthetical = scene.elements[eIdx + 1].content;
            consumedCount++;
            if (eIdx + 2 < scene.elements.length && scene.elements[eIdx + 2].type === 'dialogue') {
              dialogue = scene.elements[eIdx + 2].content;
              consumedCount++;
            }
          } else if (eIdx + 1 < scene.elements.length && scene.elements[eIdx + 1].type === 'dialogue') {
            dialogue = scene.elements[eIdx + 1].content;
            consumedCount++;
          }

          // Construct Dialogue Block HTML with proper standard screenplay indentation
          let dialogueBlockHtml = `
            <div class="screenplay-dialogue-block" style="margin-top: 14px; margin-bottom: 14px;">
              <div style="text-align: center; font-weight: 700; text-transform: uppercase; font-size: 12pt; letter-spacing: 1px; margin-bottom: 2px; color: #000000;">
                ${escapeHtml(charName)}
              </div>
          `;

          if (parenthetical) {
            // Ensure parenthetical is wrapped in parentheses if not already
            const cleanParen = parenthetical.trim().startsWith('(') ? parenthetical.trim() : `(${parenthetical.trim()})`;
            dialogueBlockHtml += `
              <div style="text-align: center; font-style: italic; font-size: 10.5pt; margin-bottom: 2px; color: #444444;">
                ${escapeHtml(cleanParen)}
              </div>
            `;
          }

          if (dialogue) {
            dialogueBlockHtml += `
              <div style="width: 68%; margin: 0 auto; text-align: left; font-size: 12pt; line-height: 1.45; color: #000000; padding-left: 10px;">
                ${escapeHtml(dialogue)}
              </div>
            `;
          }

          dialogueBlockHtml += `</div>`;

          layoutBlocks.push({
            type: 'dialogue_block',
            html: dialogueBlockHtml,
            sceneIndex: sIdx,
            elementIndex: eIdx,
            isDialogueBlock: true,
          });

          eIdx += consumedCount;
        } else if (elem.type === 'dialogue') {
          // Standalone dialogue if not preceded by character element
          const standaloneDialogueHtml = `
            <div class="screenplay-dialogue-block" style="margin-top: 8px; margin-bottom: 14px;">
              <div style="width: 68%; margin: 0 auto; text-align: left; font-size: 12pt; line-height: 1.45; color: #000000; padding-left: 10px;">
                ${escapeHtml(elem.content)}
              </div>
            </div>
          `;
          layoutBlocks.push({
            type: 'dialogue_block',
            html: standaloneDialogueHtml,
            sceneIndex: sIdx,
            elementIndex: eIdx,
          });
          eIdx++;
        } else if (elem.type === 'transition') {
          // Transition Block (Right aligned, uppercase)
          const transHtml = `
            <div class="screenplay-transition" style="text-align: right; font-weight: 700; text-transform: uppercase; font-size: 12pt; margin-top: 14px; margin-bottom: 14px; color: #222222; letter-spacing: 0.5px;">
              ${escapeHtml(elem.content)}
            </div>
          `;
          layoutBlocks.push({
            type: 'transition',
            html: transHtml,
            sceneIndex: sIdx,
            elementIndex: eIdx,
            cannotBeAtPageBottom: true,
          });
          eIdx++;
        } else {
          // Notes or parentheticals standing alone
          const noteHtml = `
            <div style="font-style: italic; font-size: 10.5pt; color: #555555; margin-bottom: 8px; text-align: center;">
              ${escapeHtml(elem.content)}
            </div>
          `;
          layoutBlocks.push({
            type: 'note',
            html: noteHtml,
            sceneIndex: sIdx,
            elementIndex: eIdx,
          });
          eIdx++;
        }
      }
    });

    // 5. Measure heights of each block accurately in DOM
    const measuredBlocks: { block: LayoutBlock; heightPx: number }[] = [];
    for (const block of layoutBlocks) {
      measureBox.innerHTML = block.html;
      const el = measureBox.firstElementChild as HTMLElement;
      // Get rendered height including margins
      const rect = el ? el.getBoundingClientRect() : { height: 30 };
      const computed = el ? window.getComputedStyle(el) : null;
      const marginTop = computed ? parseFloat(computed.marginTop) || 0 : 0;
      const marginBottom = computed ? parseFloat(computed.marginBottom) || 0 : 0;
      const totalHeight = Math.ceil(rect.height + marginTop + marginBottom);

      measuredBlocks.push({
        block,
        heightPx: Math.max(totalHeight, 20),
      });
    }

    // 6. Real Screenplay Pagination Algorithm with Widow / Orphan & Block-Protection Rules
    interface PageData {
      pageNumber: number;
      blocksHtml: string[];
    }

    const pages: PageData[] = [];
    let currentPageIndex = 0;
    let currentHeightUsed = 0;
    let currentPageBlocks: string[] = [];

    // Helper: start a new page
    const startNewPage = () => {
      if (currentPageBlocks.length > 0) {
        pages.push({
          pageNumber: currentPageIndex + 1,
          blocksHtml: [...currentPageBlocks],
        });
      }
      currentPageIndex++;
      currentHeightUsed = 0;
      currentPageBlocks = [];
    };

    // Helper: remaining vertical space on current page
    const getRemainingSpace = () => PRINTABLE_HEIGHT_PX - currentHeightUsed;

    for (let i = 0; i < measuredBlocks.length; i++) {
      const item = measuredBlocks[i];
      const nextItem = i + 1 < measuredBlocks.length ? measuredBlocks[i + 1] : null;
      const block = item.block;
      const blockHeight = item.heightPx;

      // RULE A: SCENE HEADING ORPHAN PROTECTION
      // If block is a scene heading, check if it fits AND at least the following block fits with it.
      if (block.type === 'scene_heading') {
        const nextHeight = nextItem ? nextItem.heightPx : 40;
        const requiredCombinedHeight = blockHeight + nextHeight + 10;

        if (getRemainingSpace() < requiredCombinedHeight && currentHeightUsed > 0) {
          // Not enough space for Scene Heading + following action/dialogue -> Start new page!
          startNewPage();
        }
      }

      // RULE B: TRANSITION ORPHAN PROTECTION
      // Transitions should not be stranded at the very bottom with less than 40px remaining
      if (block.type === 'transition') {
        if (getRemainingSpace() < blockHeight + 35 && currentHeightUsed > 0) {
          startNewPage();
        }
      }

      // RULE C: DIALOGUE BLOCK ATOMIC INTEGRITY
      // Character name, parenthetical, and dialogue stay together
      if (block.isDialogueBlock) {
        if (getRemainingSpace() < blockHeight && currentHeightUsed > 0) {
          // If dialogue block exceeds remaining space on current page, move entire block to next page
          startNewPage();
        }
      }

      // Standard space check for all elements
      if (getRemainingSpace() < blockHeight && currentHeightUsed > 0) {
        startNewPage();
      }

      // Place block on current page
      currentPageBlocks.push(block.html);
      currentHeightUsed += blockHeight;
    }

    // Flush last page
    if (currentPageBlocks.length > 0) {
      pages.push({
        pageNumber: currentPageIndex + 1,
        blocksHtml: [...currentPageBlocks],
      });
    }

    // Fallback if no pages created
    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        blocksHtml: [headerHtml],
      });
    }

    const totalPages = pages.length;

    // 7. Render Discrete A4 Pages and compile into high-precision jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Clear measure box
    measureBox.innerHTML = '';

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const pageData = pages[pIdx];
      const isFirstPage = pIdx === 0;

      // Construct Exact A4 Page DOM Sheet
      const a4PageSheet = document.createElement('div');
      a4PageSheet.className = 'a4-screenplay-page';
      a4PageSheet.style.width = `${PAGE_WIDTH_PX}px`;
      a4PageSheet.style.height = `${PAGE_HEIGHT_PX}px`;
      a4PageSheet.style.minHeight = `${PAGE_HEIGHT_PX}px`;
      a4PageSheet.style.maxHeight = `${PAGE_HEIGHT_PX}px`;
      a4PageSheet.style.padding = `${MARGIN_TOP_MM}mm ${MARGIN_RIGHT_MM}mm ${MARGIN_BOTTOM_MM}mm ${MARGIN_LEFT_MM}mm`;
      a4PageSheet.style.boxSizing = 'border-box';
      a4PageSheet.style.backgroundColor = '#FFFFFF';
      a4PageSheet.style.color = '#000000';
      a4PageSheet.style.position = 'relative';
      a4PageSheet.style.overflow = 'hidden';
      a4PageSheet.style.fontFamily = "'Courier Prime', 'Noto Sans Tamil', 'Mukta Malar', 'Courier New', Courier, monospace";

      // Top Page Number Header (Standard screenplay page number on Page 2 and above)
      let pageHeaderHtml = '';
      if (!isFirstPage) {
        pageHeaderHtml = `
          <div style="position: absolute; top: 12mm; right: 20mm; font-size: 10pt; font-family: inherit; color: #444444; font-weight: bold; letter-spacing: 1px;">
            ${pageData.pageNumber}.
          </div>
        `;
      }

      // Bottom Footer Watermark (Subtle & clean)
      const pageFooterHtml = `
        <div style="position: absolute; bottom: 8mm; left: 25mm; right: 20mm; display: flex; justify-content: space-between; border-top: 1px solid #e0e0e0; padding-top: 4px; font-size: 8pt; color: #888888; font-family: inherit;">
          <span>${escapeHtml(script.title || 'Screenplay')} • CineScript AI</span>
          <span>Page ${pageData.pageNumber} of ${totalPages}</span>
        </div>
      `;

      // Assemble content inside printable container
      const contentContainerHtml = `
        <div style="width: ${PRINTABLE_WIDTH_PX}px; min-height: ${PRINTABLE_HEIGHT_PX}px; box-sizing: border-box;">
          ${pageData.blocksHtml.join('')}
        </div>
      `;

      a4PageSheet.innerHTML = `${pageHeaderHtml}${contentContainerHtml}${pageFooterHtml}`;
      stagingWrapper.appendChild(a4PageSheet);

      // Render high-DPI canvas of this specific A4 page
      const canvas = await html2canvas(a4PageSheet, {
        scale: 2.5, // 2.5x crisp rendering (~240-300 DPI) for razor-sharp typography
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        width: PAGE_WIDTH_PX,
        height: PAGE_HEIGHT_PX,
        windowWidth: PAGE_WIDTH_PX,
        windowHeight: PAGE_HEIGHT_PX,
      });

      const imgData = canvas.toDataURL('image/png');

      // If not the first page, add a new A4 page to jsPDF
      if (pIdx > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Draw exactly onto the 210mm x 297mm A4 page
      pdf.addImage(imgData, 'PNG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, 'FAST');

      // Remove the rendered page sheet to free DOM memory
      stagingWrapper.removeChild(a4PageSheet);
    }

    // 8. Save PDF with sanitized title
    const safeTitle = (script.title || 'Screenplay')
      .trim()
      .replace(/[^a-zA-Z0-9\u0B80-\u0BFF_-]/g, '_')
      .replace(/_+/g, '_');

    pdf.save(`${safeTitle}_Screenplay_A4.pdf`);
  } finally {
    // Clean up staging container
    if (document.body.contains(stagingWrapper)) {
      document.body.removeChild(stagingWrapper);
    }
  }
}

/**
 * Escapes HTML characters safely while preserving Unicode characters
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
