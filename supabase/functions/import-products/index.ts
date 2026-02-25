import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple CSV parser that handles multi-line quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i += char === "\r" ? 2 : 1;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// Clean HTML: strip ChatGPT wrapper divs and keep only meaningful content
function cleanHTML(html: string): string {
  if (!html || html.trim().length === 0) return "";

  // Remove ChatGPT wrapper elements
  let cleaned = html;

  // Remove all div, article, main, form, section, button, svg, textarea, input, span elements that are wrappers
  // Keep only p, ul, ol, li, strong, em, br tags
  const allowedTags = new Set([
    "p",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "br",
    "b",
    "i",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ]);

  // Extract text content from p, li tags with basic formatting
  const paragraphs: string[] = [];
  // Match <p ...>content</p> and <li ...>content</li>
  const pRegex =
    /<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = pRegex.exec(cleaned)) !== null) {
    let content = match[2].trim();
    if (!content || content === "<br>" || content === '<br class="ProseMirror-trailingBreak">') continue;

    // Skip ChatGPT UI elements
    if (
      content.includes("Pergunte alguma coisa") ||
      content.includes("placeholder") ||
      content.includes("composer") ||
      content.includes("ProseMirror") ||
      content.includes("Adicionar arquivos") ||
      content.includes("Botão de ditado") ||
      content.includes("Iniciar Voz")
    )
      continue;

    // Remove data attributes but keep tag content
    content = content.replace(/ data-[a-z-]+="[^"]*"/g, "");
    // Remove class attributes
    content = content.replace(/ class="[^"]*"/g, "");
    // Remove style attributes
    content = content.replace(/ style="[^"]*"/g, "");

    if (content.trim().length > 0) {
      const tag = match[1].toLowerCase();
      if (tag === "li") {
        paragraphs.push(`<li>${content}</li>`);
      } else {
        paragraphs.push(`<p>${content}</p>`);
      }
    }
  }

  // Also check for <ul> structures
  let result = "";
  let inList = false;
  for (const p of paragraphs) {
    if (p.startsWith("<li>")) {
      if (!inList) {
        result += "<ul>";
        inList = true;
      }
      result += p;
    } else {
      if (inList) {
        result += "</ul>";
        inList = false;
      }
      result += p;
    }
  }
  if (inList) result += "</ul>";

  return result || html; // fallback to original if extraction fails
}

// Extract short description from HTML (first paragraph text)
function extractShortDescription(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!match) return "";
  // Strip all HTML tags
  return match[1].replace(/<[^>]+>/g, "").trim().substring(0, 250);
}

// Map Shopify type to product type tag
function mapType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("brinco")) return "Brinco";
  if (lower.includes("conjunto")) return "Conjunto";
  if (lower.includes("pingente")) return "Pingente";
  if (lower.includes("colar") || lower.includes("corrente") || lower.includes("choker"))
    return "Colar";
  if (lower.includes("pulseira") || lower.includes("bracelete")) return "Pulseira";
  if (lower.includes("anel")) return "Anel";
  if (lower.includes("tornozeleira")) return "Tornozeleira";
  return type;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { csv } = await req.json();
    if (!csv) {
      return new Response(JSON.stringify({ error: "CSV data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV has no data rows" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[0];
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => (headerMap[h.trim()] = i));

    const col = (row: string[], name: string) =>
      headerMap[name] !== undefined ? (row[headerMap[name]] || "").trim() : "";

    // Group rows by Handle
    interface ProductGroup {
      mainRow: string[];
      imageRows: string[][];
    }
    const groups: Map<string, ProductGroup> = new Map();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 5) continue;
      const handle = col(row, "Handle");
      if (!handle) continue;

      const title = col(row, "Title");
      if (title) {
        // Main product row
        groups.set(handle, { mainRow: row, imageRows: [] });
      } else {
        // Additional image row
        const group = groups.get(handle);
        if (group) {
          group.imageRows.push(row);
        }
      }
    }

    console.log(`Found ${groups.size} products to import`);

    // Delete existing demo products and their images
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id");
    
    if (existingProducts && existingProducts.length > 0) {
      const productIds = existingProducts.map((p: any) => p.id);
      
      // Delete related data first
      await supabase.from("product_images").delete().in("product_id", productIds);
      await supabase.from("product_variants").delete().in("product_id", productIds);
      await supabase.from("product_badges").delete().in("product_id", productIds);
      await supabase.from("product_custom_fields").delete().in("product_id", productIds);
      await supabase.from("product_categories").delete().in("product_id", productIds);
      await supabase.from("collection_products").delete().in("product_id", productIds);
      await supabase.from("cart_items").delete().in("product_id", productIds);
      await supabase.from("favorites").delete().in("product_id", productIds);
      await supabase.from("reviews").delete().in("product_id", productIds);
      
      // Delete products
      await supabase.from("products").delete().in("id", productIds);
      console.log(`Deleted ${productIds.length} existing products`);
    }

    // Insert new products
    const results: { name: string; status: string; error?: string }[] = [];

    for (const [handle, group] of groups) {
      const row = group.mainRow;

      const title = col(row, "Title");
      const bodyHtml = col(row, "Body (HTML)");
      const vendor = col(row, "Vendor");
      const type = col(row, "Type");
      const tags = col(row, "Tags");
      const price = parseFloat(col(row, "Variant Price") || "0");
      const comparePrice = parseFloat(col(row, "Variant Compare At Price") || "0");
      const sku = col(row, "Variant SKU");
      const stock = parseInt(col(row, "Variant Inventory Qty") || "0", 10);
      const barcode = col(row, "Variant Barcode").replace(/'/g, "");
      const weight = parseFloat(col(row, "Variant Grams") || "0") / 1000; // grams to kg
      const weightUnit = col(row, "Variant Weight Unit");
      const seoTitle = col(row, "SEO Title");
      const seoDesc = col(row, "SEO Description");
      const status = col(row, "Status");
      const imageSrc = col(row, "Image Src");
      const imageAlt = col(row, "Image Alt Text");
      const material = col(row, "Material de joias (product.metafields.shopify.jewelry-material)");
      const jewelryType = col(row, "Tipos de joias (product.metafields.shopify.jewelry-type)");
      const color = col(row, "Cor (product.metafields.shopify.color-pattern)");

      const cleanedDescription = cleanHTML(bodyHtml);
      const shortDesc = extractShortDescription(cleanedDescription);

      // Determine brand from vendor
      const brand = vendor || "Lizara Semi Joias";

      // Build tags array
      const tagsList: string[] = [];
      if (tags) tagsList.push(...tags.split(",").map((t: string) => t.trim()).filter(Boolean));
      if (material) tagsList.push(material);
      if (jewelryType) tagsList.push(jewelryType);
      if (color) tagsList.push(color);
      if (type) tagsList.push(type);

      const productData = {
        name: title,
        slug: handle,
        description: cleanedDescription,
        short_description: shortDesc,
        price: price,
        compare_at_price: comparePrice > 0 ? comparePrice : null,
        sku: sku || null,
        barcode: barcode || null,
        stock: Math.max(stock, 0),
        weight: weightUnit === "kg" ? weight * 1000 : weight, // store in grams
        brand: brand,
        tags: tagsList.length > 0 ? tagsList : null,
        is_active: status === "active",
        is_featured: false,
        is_new: true,
        show_on_home: true,
        track_stock: true,
        product_type: "physical" as const,
        status: status === "active" ? "active" : "draft",
        meta_title: seoTitle || null,
        meta_description: seoDesc || null,
        free_shipping: false,
      };

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert(productData)
        .select("id")
        .single();

      if (productError) {
        console.error(`Error inserting ${title}:`, productError);
        results.push({ name: title, status: "error", error: productError.message });
        continue;
      }

      // Insert images
      const images: { product_id: string; url: string; alt_text: string; sort_order: number; is_primary: boolean }[] = [];

      if (imageSrc) {
        images.push({
          product_id: product.id,
          url: imageSrc,
          alt_text: imageAlt || title,
          sort_order: 0,
          is_primary: true,
        });
      }

      for (let j = 0; j < group.imageRows.length; j++) {
        const imgRow = group.imageRows[j];
        const imgSrc = col(imgRow, "Image Src");
        const imgAlt = col(imgRow, "Image Alt Text");
        if (imgSrc) {
          images.push({
            product_id: product.id,
            url: imgSrc,
            alt_text: imgAlt || title,
            sort_order: j + 1,
            is_primary: false,
          });
        }
      }

      if (images.length > 0) {
        const { error: imgError } = await supabase.from("product_images").insert(images);
        if (imgError) {
          console.error(`Error inserting images for ${title}:`, imgError);
        }
      }

      results.push({ name: title, status: "ok" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: results.filter((r) => r.status === "ok").length,
        errors: results.filter((r) => r.status === "error").length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
