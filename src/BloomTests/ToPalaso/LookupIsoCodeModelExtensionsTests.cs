﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Bloom.ToPalaso;
using NUnit.Framework;
using Palaso.UI.WindowsForms.WritingSystems;

namespace BloomTests.ToPalaso
{
	[TestFixture]
	public class LookupIsoCodeModelExtensionsTests
	{
		/// <summary>
		/// This is the one the extension was made for, finds a name that GetExactLanguageMatch misses
		/// </summary>
		[Test]
		public void GetBestLanguageName_ForARA_FindsArabic()
		{
			var sut = new LookupIsoCodeModel();
			Assert.That(sut.GetBestLanguageName("ara"), Is.EqualTo("Arabic"));
		}

		/// <summary>
		/// Routine match in GetExactLanguageMatch.
		/// </summary>
		[Test]
		public void GetBestLanguageName_ForFR_FindsFrench()
		{
			var sut = new LookupIsoCodeModel();
			Assert.That(sut.GetBestLanguageName("fr"), Is.EqualTo("French"));
		}

		/// <summary>
		/// No match at all.
		/// </summary>
		[Test]
		public void GetBestLanguageName_ForXYZ_FindsXYZ()
		{
			var sut = new LookupIsoCodeModel();
			Assert.That(sut.GetBestLanguageName("xyz"), Is.EqualTo("xyz"));
		}

		/// <summary>
		/// In this test, GetMatchingLanguages finds some, but none have the exact right code.
		/// </summary>
		[Test]
		public void GetBestLanguageName_ForArab_FindsArab()
		{
			var sut = new LookupIsoCodeModel();
			Assert.That(sut.GetBestLanguageName("arab"), Is.EqualTo("arab"));
		}
	}
}