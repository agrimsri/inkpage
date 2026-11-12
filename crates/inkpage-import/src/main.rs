use clap::Parser;
use inkpage_import::converter::ExportFormat;
use inkpage_import::{ImportOptions, import_file};
use std::path::PathBuf;
use std::process;

#[derive(Parser, Debug)]
#[command(
    name = "inkpage-import",
    author = "Inkpage Contributors",
    version = "0.1.0",
    about = "Imports Microsoft OneNote notebooks, sections, .onepkg archives, and OneDrive ZIPs into Inkpage format"
)]
struct Args {
    /// Path to input .one, .onetoc2, .onepkg, .zip, or notebook directory
    #[arg(value_name = "INPUT_PATH")]
    input: PathBuf,

    /// Output directory for imported files
    #[arg(short = 'o', long = "output", default_value = "./output")]
    output: PathBuf,

    /// Target format: native (.inkbook directory), md (Markdown), or json (Single JSON)
    #[arg(short = 'f', long = "format", default_value = "native")]
    format: String,

    /// Optional title override for the imported notebook
    #[arg(short = 't', long = "title")]
    title: Option<String>,
}

fn main() {
    let args = Args::parse();

    let export_format = match args.format.to_lowercase().as_str() {
        "native" => ExportFormat::Native,
        "md" | "markdown" => ExportFormat::Markdown,
        "json" => ExportFormat::Json,
        other => {
            eprintln!("Error: Unknown format '{}'. Supported: native, md, json", other);
            process::exit(1);
        }
    };

    let options = ImportOptions {
        output_dir: args.output,
        format: export_format,
        notebook_title_override: args.title,
    };

    println!("Importing from: {}", args.input.display());
    match import_file(&args.input, &options) {
        Ok((notebook, report)) => {
            println!("Import successful!");
            println!("  Notebook: {}", notebook.title.0);
            println!("  Sections: {}", report.sections_count);
            println!("  Pages:    {}", report.pages_count);
            println!("  Images:   {}", report.images_count);
            println!("  Files:    {}", report.attachments_count);
            println!("  Duration: {} ms", report.duration_ms);
            if !report.warnings.is_empty() {
                println!("  Warnings: {}", report.warnings.len());
                for w in &report.warnings {
                    println!("    - [{}] {}", w.code, w.message);
                }
            }
        }
        Err(err) => {
            eprintln!("Import failed: {}", err);
            process::exit(1);
        }
    }
}
