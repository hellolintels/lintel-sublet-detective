
/**
 * Utilities for generating HTML and Excel reports from scraping results
 */

/**
 * Generate an HTML report from scraping results
 */
export function generateHtmlReport(scrapingResults: any[]): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #333;">Postcode Matching Results</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Postcode</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Address</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Airbnb</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">SpareRoom</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Gumtree</th>
          </tr>
        </thead>
        <tbody>
          ${scrapingResults.map(result => `
            <tr>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">${result.postcode}</td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">${result.address || result.streetName || 'Not available'}</td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${formatCell(result.airbnb)}
              </td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${formatCell(result.spareroom)}
              </td>
              <td style="padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${formatCell(result.gumtree)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate an Excel (.xls) report from scraping results
 */
export function generateExcelReport(scrapingResults: any[], contactInfo?: any): string {
  // Create Excel XML format (compatible with .xls)
  const companyHeader = contactInfo ? 
    `<Row>
      <Cell><Data ss:Type="String">Company:</Data></Cell>
      <Cell><Data ss:Type="String">${contactInfo.company || 'Not provided'}</Data></Cell>
    </Row>
    <Row>
      <Cell><Data ss:Type="String">Contact:</Data></Cell>
      <Cell><Data ss:Type="String">${contactInfo.full_name || 'Not provided'}</Data></Cell>
    </Row>
    <Row>
      <Cell><Data ss:Type="String">Email:</Data></Cell>
      <Cell><Data ss:Type="String">${contactInfo.email || 'Not provided'}</Data></Cell>
    </Row>
    <Row></Row>` : '';

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Lintels.in</Author>
  <LastAuthor>Lintels.in</LastAuthor>
  <Created>${new Date().toISOString()}</Created>
  <Version>16.00</Version>
 </DocumentProperties>
 <OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">
  <AllowPNG/>
 </OfficeDocumentSettings>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>9000</WindowHeight>
  <WindowWidth>13860</WindowWidth>
  <WindowTopX>0</WindowTopX>
  <WindowTopY>0</WindowTopY>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="s62">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#5B9BD5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="s63">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FF0000"/>
  </Style>
  <Style ss:ID="s64">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#999999"/>
  </Style>
  <Style ss:ID="s65">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FF9900" ss:Bold="1"/>
  </Style>
  <Style ss:ID="s66">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#009900" ss:Bold="1"/>
  </Style>
  <Style ss:ID="hyperlink">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#0563C1" ss:Underline="Single"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Postcode Matching Results">
  <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="${scrapingResults.length + 5}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="65" ss:DefaultRowHeight="15">
   <Column ss:Width="80"/>
   <Column ss:Width="180"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   
   ${companyHeader}
   
   <Row>
    <Cell ss:StyleID="s62"><Data ss:Type="String">Postcode</Data></Cell>
    <Cell ss:StyleID="s62"><Data ss:Type="String">Address</Data></Cell>
    <Cell ss:StyleID="s62"><Data ss:Type="String">Airbnb</Data></Cell>
    <Cell ss:StyleID="s62"><Data ss:Type="String">SpareRoom</Data></Cell>
    <Cell ss:StyleID="s62"><Data ss:Type="String">Gumtree</Data></Cell>
   </Row>
   ${scrapingResults.map(result => `
   <Row>
    <Cell><Data ss:Type="String">${result.postcode}</Data></Cell>
    <Cell><Data ss:Type="String">${result.address || result.streetName || 'Not available'}</Data></Cell>
    ${formatExcelCell(result.airbnb)}
    ${formatExcelCell(result.spareroom)}
    ${formatExcelCell(result.gumtree)}
   </Row>
   `).join('')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
   </PageSetup>
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <Panes>
    <Pane>
     <Number>3</Number>
    </Pane>
    <Pane>
     <Number>2</Number>
     <ActiveRow>0</ActiveRow>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

/**
 * Format a cell in the Excel report
 */
export function formatExcelCell(platformResult: any): string {
  if (!platformResult) {
    return `<Cell ss:StyleID="s64"><Data ss:Type="String">error</Data></Cell>`;
  }
  
  if (typeof platformResult === 'string') {
    // Handle direct string values (from ScrapingBee implementation)
    if (platformResult.includes("Investigate (High)")) {
      return `<Cell ss:StyleID="s66"><Data ss:Type="String">${platformResult.replace(/=HYPERLINK\("([^"]+)","([^"]+)"\)/, '$2')}</Data></Cell>`;
    }
    
    if (platformResult.includes("Investigate")) {
      return `<Cell ss:StyleID="s65"><Data ss:Type="String">${platformResult.replace(/=HYPERLINK\("([^"]+)","([^"]+)"\)/, '$2')}</Data></Cell>`;
    }
    
    if (platformResult === "No match") {
      return `<Cell ss:StyleID="s64"><Data ss:Type="String">no match</Data></Cell>`;
    }
    
    return `<Cell><Data ss:Type="String">${platformResult}</Data></Cell>`;
  }
  
  // Handle object values (from Bright Data implementation)
  if (platformResult.status === "error") {
    return `<Cell ss:StyleID="s64"><Data ss:Type="String">error</Data></Cell>`;
  }
  
  if (platformResult.status === "no match") {
    if (platformResult.url) {
      return `<Cell ss:StyleID="hyperlink" ss:HRef="${platformResult.url}"><Data ss:Type="String">no match</Data></Cell>`;
    }
    return `<Cell ss:StyleID="s64"><Data ss:Type="String">no match</Data></Cell>`;
  }
  
  if (platformResult.status === "investigate") {
    const confidenceLevel = platformResult.confidenceScore && platformResult.confidenceScore > 0.8 ? "High" : "Medium";
    const styleId = confidenceLevel === "High" ? "s66" : "s65";
    
    if (platformResult.url) {
      return `<Cell ss:StyleID="hyperlink" ss:HRef="${platformResult.url}"><Data ss:Type="String">investigate (${confidenceLevel})</Data></Cell>`;
    }
    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">investigate (${confidenceLevel})</Data></Cell>`;
  }
  
  return `<Cell><Data ss:Type="String">${platformResult.status}</Data></Cell>`;
}

/**
 * Format a cell in the HTML report
 */
export function formatCell(platformResult: any): string {
  if (!platformResult) {
    return `<span style="color: #999;">error</span>`;
  }
  
  if (typeof platformResult === 'string') {
    // Handle direct string values (from ScrapingBee implementation)
    if (platformResult.includes("Investigate (High)")) {
      const url = platformResult.match(/=HYPERLINK\("([^"]+)"/)?.[1] || '';
      return `<a href="${url}" target="_blank" style="color: #009900; font-weight: bold; text-decoration: underline;">investigate (High)</a>`;
    }
    
    if (platformResult.includes("Investigate")) {
      const url = platformResult.match(/=HYPERLINK\("([^"]+)"/)?.[1] || '';
      return `<a href="${url}" target="_blank" style="color: #d9534f; font-weight: bold; text-decoration: underline;">investigate</a>`;
    }
    
    if (platformResult === "No match") {
      return `<span style="color: #888;">no match</span>`;
    }
    
    return `<span>${platformResult}</span>`;
  }
  
  // Handle object values (from Bright Data implementation)
  if (platformResult.status === "error") {
    return `<span style="color: #999;">error</span>`;
  }
  
  if (platformResult.status === "no match") {
    if (platformResult.url) {
      return `<a href="${platformResult.url}" target="_blank" style="color: #888; text-decoration: underline;">no match</a>`;
    }
    return `<span style="color: #888;">no match</span>`;
  }
  
  if (platformResult.status === "investigate") {
    const confidenceLevel = platformResult.confidenceScore && platformResult.confidenceScore > 0.8 ? "High" : "Medium";
    const color = confidenceLevel === "High" ? "#009900" : "#d9534f";
    
    if (platformResult.url) {
      return `<a href="${platformResult.url}" target="_blank" style="color: ${color}; font-weight: bold; text-decoration: underline;">investigate (${confidenceLevel})</a>`;
    }
    return `<span style="color: ${color}; font-weight: bold;">investigate (${confidenceLevel})</span>`;
  }
  
  return `<span>${platformResult.status}</span>`;
}

/**
 * Generate a CSV report from scraping results (legacy)
 * @deprecated Use generateExcelReport instead
 */
export function generateCsvReport(scrapingResults: any[]): string {
  const headers = "Postcode,Airbnb,SpareRoom,Gumtree,Airbnb URL,SpareRoom URL,Gumtree URL\n";
  const rows = scrapingResults.map(result => {
    const airbnbStatus = result.airbnb?.status || "error";
    const spareroomStatus = result.spareroom?.status || "error";
    const gumtreeStatus = result.spareroom?.status || "error";
    
    const airbnbUrl = result.airbnb?.url || "";
    const spareroomUrl = result.spareroom?.url || "";
    const gumtreeUrl = result.gumtree?.url || "";
    
    return `"${result.postcode}","${airbnbStatus}","${spareroomStatus}","${gumtreeStatus}","${airbnbUrl}","${spareroomUrl}","${gumtreeUrl}"`;
  }).join("\n");
  
  return headers + rows;
}
