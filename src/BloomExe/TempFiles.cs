﻿using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using System.Xml;
using Palaso.IO;

namespace BloomTemp
{
	public class TempLiftFile : TempFile
	{
		public TempLiftFile(string xmlOfEntries)
			: this(xmlOfEntries, /*LiftIO.Validation.Validator.LiftVersion*/ "0.12")
		{
		}
		public TempLiftFile(string xmlOfEntries, string claimedLiftVersion)
			: this(null, xmlOfEntries, claimedLiftVersion)
		{
		}

		public TempLiftFile(TemporaryFolder parentFolder, string xmlOfEntries, string claimedLiftVersion)
			: base(false)
		{
			if (parentFolder != null)
			{
				_path = parentFolder.GetPathForNewTempFile(false) + ".lift";
			}
			else
			{
				_path = System.IO.Path.GetRandomFileName() + ".lift";
			}

			string liftContents = string.Format("<?xml version='1.0' encoding='utf-8'?><lift version='{0}'>{1}</lift>", claimedLiftVersion, xmlOfEntries);
			File.WriteAllText(_path, liftContents);
		}

		public TempLiftFile(string fileName, TemporaryFolder parentFolder, string xmlOfEntries, string claimedLiftVersion)
			: base(false)
		{
			_path = parentFolder.Combine(fileName);

			string liftContents = string.Format("<?xml version='1.0' encoding='utf-8'?><lift version='{0}'>{1}</lift>", claimedLiftVersion, xmlOfEntries);
			File.WriteAllText(_path, liftContents);
		}
		private TempLiftFile()
		{
		}
		public static TempLiftFile TrackExisting(string path)
		{
			Debug.Assert(File.Exists(path));
			TempLiftFile t = new TempLiftFile();
			t._path = path;
			return t;
		}

	}

	public static class TempFileUtils
	{
		public static TempFile CreateHtm5FromXml(XmlNode dom)
		{
			var temp = TempFile.TrackExisting(GetHtmlTempPath());


			XmlWriterSettings settings = new XmlWriterSettings();
			settings.Indent = true;
			settings.CheckCharacters = true;
			settings.OmitXmlDeclaration = true;//we're aiming at normal html5, here. Not xhtml.
			//CAN'T DO THIS: settings.OutputMethod = XmlOutputMethod.Html; // JohnT: someone please explain why not?

			// Enhance JohnT: no reason to go to disk for this intermediate version.
			using (var writer = XmlWriter.Create(temp.Path, settings))
			{
				dom.WriteContentTo(writer);
				writer.Close();
			}
			// xml output will produce things like <title /> or <div /> for empty elements, which are not valid HTML 5 and produce
			// weird results; for example, the browser interprets <title /> as the beginning of an element that is not terminated
			// until the end of the whole document. Thus, everything becomes part of the title. This then causes errors in our
			// thumbnail generation because gecko thinks the document has an empty  body (the real one is lost inside the title).
			// Also, embedded controls (like ReaderTools.htm) now pass through this xml-to-html conversion, and this file contains
			// several more kinds of empty element, some of which have attributes.
			// There are probably more elements than these which may not be empty. However we can't just use [^ ]* in place of title|div
			// because there are some elements that never have content like <br /> which should NOT be converted.
			// It seems safest to just list the ones that can occur empty in Bloom...if we can't find a more reliable way to convert to HTML5.
			string xhtml = File.ReadAllText(temp.Path);
			var re = new Regex("<(title|div|i|table|td|span) ([^<]*)/>");
			xhtml = re.Replace(xhtml, "<$1 $2></$1>");
			//now insert the non-xml-ish <!doctype html>
			File.WriteAllText(temp.Path, string.Format("<!DOCTYPE html>{0}{1}", Environment.NewLine,xhtml));

			return temp;
		}

		private static string GetHtmlTempPath()
		{
			string x,y;
			do
			{
				x = Path.GetTempFileName();
				y = x + ".htm";
			} while (File.Exists(y));
			File.Move(x,y);
			return y;
		}
	}

	// ENHANCE: Replace with TemporaryFolder implemented in Palaso. However, that means
	// refactoring some Palaso code and moving TemporaryFolder from Palaso.TestUtilities into
	// Palaso.IO
	public class TemporaryFolder : IDisposable
	{
		private string _path;


		static public TemporaryFolder TrackExisting(string path)
		{
			Debug.Assert(Directory.Exists(path));
			TemporaryFolder f = new TemporaryFolder();
			f._path = path;
			return f;
		}

		[Obsolete("Go ahead and give it a name related to the test.  Makes it easier to track down problems.")]
		public TemporaryFolder()
			: this("unnamedTestFolder")
		{
		}


		public TemporaryFolder(string name)
		{
			_path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), name);
			if (Directory.Exists(_path))
			{
			   DeleteFolderThatMayBeInUse(_path);
			}
			Directory.CreateDirectory(_path);
		}

		public TemporaryFolder(TemporaryFolder parent, string name)
		{
			_path = parent.Combine(name);
			if (Directory.Exists(_path))
			{
			   DeleteFolderThatMayBeInUse(_path);
			}
			Directory.CreateDirectory(_path);
		}

		public string FolderPath
		{
			get { return _path; }
		}


		public void Dispose()
		{
		   DeleteFolderThatMayBeInUse(_path);
		}

		[Obsolete("It's better to wrap the use of this in a using() so that it is automatically cleaned up, even if a test fails.")]
		public void Delete()
		{
		   DeleteFolderThatMayBeInUse(_path);
		}

		public string GetPathForNewTempFile(bool doCreateTheFile)
		{
			string s = System.IO.Path.GetRandomFileName();
			s = System.IO.Path.Combine(_path, s);
			if (doCreateTheFile)
			{
				File.Create(s).Close();
			}
			return s;
		}

		public string GetPathForNewTempFile(bool doCreateTheFile, string extension)
		{
			extension = extension.TrimStart('.');
			var s = System.IO.Path.Combine(_path, System.IO.Path.GetRandomFileName() + "." + extension);

			if (doCreateTheFile)
			{
				File.Create(s).Close();
			}
			return s;
		}

		public TempFile GetNewTempFile(bool doCreateTheFile)
		{
			string s = System.IO.Path.GetRandomFileName();
			s = System.IO.Path.Combine(_path, s);
			if (doCreateTheFile)
			{
				File.Create(s).Close();
			}
			return TempFile.TrackExisting(s);
		}

		[Obsolete("It's better to use the explict GetNewTempFile, which makes you say if you want the file to be created or not, and give you back a whole TempFile class, which is itself IDisposable.")]
		public string GetTemporaryFile()
		{
			return GetTemporaryFile(System.IO.Path.GetRandomFileName());
		}

		[Obsolete("It's better to use the explict GetNewTempFile, which makes you say if you want the file to be created or not, and give you back a whole TempFile class, which is itself IDisposable.")]
		public string GetTemporaryFile(string name)
		{
			string s = System.IO.Path.Combine(_path, name);
			File.Create(s).Close();
			return s;
		}


		public string Combine(params string[] partsOfThePath)
		{
			string result = _path;
			foreach (var s in partsOfThePath)
			{
				result = System.IO.Path.Combine(result, s);
			}
			return result;
		}


		public static void DeleteFolderThatMayBeInUse(string folder)
		{
			if (Directory.Exists(folder))
			{
				try
				{
					Directory.Delete(folder, true);
				}
				catch (Exception e)
				{
					try
					{
						Debug.WriteLine(e.Message);
						//maybe we can at least clear it out a bit
						string[] files = Directory.GetFiles(folder, "*.*", SearchOption.AllDirectories);
						foreach (string s in files)
						{
							try
							{
								File.Delete(s);
							}
							catch (Exception)
							{
							}
						}
						//sleep and try again (in case some other thread will  let go of them)
						Thread.Sleep(1000);
						Directory.Delete(folder, true);
					}
					catch (Exception)
					{
					}
				}
			}
		}
	}

}