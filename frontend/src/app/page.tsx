"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { api, mediaUrl } from "@/lib/api";
import { getAuthUser, isLoggedIn } from "@/lib/auth";

type ContactState = {
  name: string;
  email: string;
  message: string;
};

type PublicStory = {
  id: number;
  userId?: number;
  userName: string;
  imageUrl: string;
  note: string;
  status?: string;
  expiresAt: string;
};

const heroSlides = [
  { src: "/images/hero/1.png", alt: "Fragrance Mist luxury perfume spray" },
  { src: "/images/hero/2.png", alt: "Dark Addiction perfume spray" },
  { src: "/images/hero/3.png", alt: "Can Can perfume spray" },
  { src: "/images/hero/4.png", alt: "Versace Eros inspired perfume spray" },
  {
    src: "/images/hero/5.png",
    alt: "Ariana Grande Cloud inspired perfume spray",
  },
  { src: "/images/hero/6.png", alt: "Valaya inspired perfume spray" },
];

const storySteps = [
  {
    number: "01",
    title: "For the Student",
    text: 'Stay "fresh" from the morning lecture to the late-night group study.',
  },
  {
    number: "02",
    title: "For the Driver & Worker",
    text: "A scent that cuts through the smoke and the sweat, keeping you smelling clean and professional through every shift.",
  },
  {
    number: "03",
    title: "For Every Pinoy",
    text: 'A high-quality fragrance that does not break the bank. Because looking and smelling "premium" should not be a luxury—it should be your daily standard.',
  },
];

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const carouselPauseUntilRef = useRef(0);
  const carouselResumeTimerRef = useRef<number | null>(null);

  const [contact, setContact] = useState<ContactState>({
    name: "",
    email: "",
    message: "",
  });
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  const [stories, setStories] = useState<PublicStory[]>([]);
  const [myStories, setMyStories] = useState<PublicStory[]>([]);
  const [storyNote, setStoryNote] = useState("");
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState("");
  const [storyMessage, setStoryMessage] = useState("");
  const [storyLoading, setStoryLoading] = useState(false);
  const [authUserName, setAuthUserName] = useState("");
  const [storySearchTerm, setStorySearchTerm] = useState("");

  useEffect(() => {
    async function loadStories() {
      try {
        const response = await api.get<{
          success: boolean;
          message: string;
          data: PublicStory[];
        }>("/stories");
        setStories(response.data || []);
      } catch {
        setStories([]);
      }

      if (isLoggedIn()) {
        try {
          const mine = await api.get<{
            success: boolean;
            message: string;
            data: PublicStory[];
          }>("/stories/mine");
          setMyStories(mine.data || []);
        } catch {
          setMyStories([]);
        }
      } else {
        setMyStories([]);
      }
    }

    function syncAuth() {
      setAuthUserName(getAuthUser()?.fullName || "");
    }

    loadStories();
    syncAuth();

    window.addEventListener("auth-updated", syncAuth);
    return () => window.removeEventListener("auth-updated", syncAuth);
  }, []);

  useEffect(() => {
    let ticking = false;

    function handleScroll() {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking = false;
      });
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px",
        },
    );

    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [stories.length, myStories.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Date.now() < carouselPauseUntilRef.current) return;
      setHeroSlideIndex((current) => (current + 1) % heroSlides.length);
    }, 6000);

    return () => {
      window.clearInterval(interval);
      if (carouselResumeTimerRef.current) {
        window.clearTimeout(carouselResumeTimerRef.current);
      }
    };
  }, []);

  const filteredStories = useMemo(() => {
    const query = storySearchTerm.trim().toLowerCase();

    if (!query) return stories;

    return stories.filter((story) =>
        [story.userName, story.note, story.status]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
    );
  }, [stories, storySearchTerm]);

  function pauseHeroAutoplay() {
    carouselPauseUntilRef.current = Date.now() + 10000;

    if (carouselResumeTimerRef.current) {
      window.clearTimeout(carouselResumeTimerRef.current);
    }

    carouselResumeTimerRef.current = window.setTimeout(() => {
      carouselPauseUntilRef.current = 0;
    }, 10000);
  }

  function moveHeroSlide(direction: number) {
    pauseHeroAutoplay();
    setHeroSlideIndex(
        (current) =>
            (current + direction + heroSlides.length) % heroSlides.length,
    );
  }

  function chooseHeroSlide(index: number) {
    pauseHeroAutoplay();
    setHeroSlideIndex(index);
  }

  function chooseStoryFile(file?: File) {
    if (!file) return;

    if (storyPreview) {
      URL.revokeObjectURL(storyPreview);
    }

    setStoryFile(file);
    setStoryPreview(URL.createObjectURL(file));
    setStoryMessage("");
  }

  async function handleStorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoggedIn()) {
      setStoryMessage("Login first before sharing your perfume story.");
      return;
    }

    if (!storyFile) {
      setStoryMessage("Choose a photo first.");
      return;
    }

    try {
      setStoryLoading(true);
      setStoryMessage("");

      const formData = new FormData();
      formData.append("image", storyFile);
      formData.append("note", storyNote);

      const response = await api.post<{
        success: boolean;
        message: string;
        data: unknown;
      }>("/stories", formData);

      setStoryMessage(
          response.message || "Story submitted for admin approval.",
      );
      setStoryNote("");
      setStoryFile(null);

      if (storyPreview) {
        URL.revokeObjectURL(storyPreview);
      }

      setStoryPreview("");

      const mine = await api.get<{
        success: boolean;
        message: string;
        data: PublicStory[];
      }>("/stories/mine");

      setMyStories(mine.data || []);
    } catch (error) {
      setStoryMessage(
          error instanceof Error ? error.message : "Story submission failed.",
      );
    } finally {
      setStoryLoading(false);
    }
  }

  async function handleStoryDelete(storyId: number) {
    try {
      setStoryMessage("");

      const response = await api.delete<{
        success: boolean;
        message: string;
        data: unknown;
      }>(`/stories/${storyId}`);

      setStoryMessage(response.message || "Story removed.");
      setMyStories((current) =>
          current.filter((story) => story.id !== storyId),
      );
    } catch (error) {
      setStoryMessage(
          error instanceof Error ? error.message : "Unable to remove story.",
      );
    }
  }

  async function handleStoryReplace(storyId: number, file?: File) {
    if (!file) return;

    try {
      setStoryMessage("");

      const formData = new FormData();
      formData.append("image", file);

      const response = await api.put<{
        success: boolean;
        message: string;
        data: PublicStory;
      }>(`/stories/${storyId}`, formData);

      setStoryMessage(
          response.message || "Story picture replaced for admin approval.",
      );

      setMyStories((current) =>
          current.map((story) => (story.id === storyId ? response.data : story)),
      );
    } catch (error) {
      setStoryMessage(
          error instanceof Error
              ? error.message
              : "Unable to replace story picture.",
      );
    }
  }

  async function handleStoryNoteUpdate(storyId: number, note: string) {
    try {
      setStoryMessage("");

      const formData = new FormData();
      formData.append("note", note);

      const response = await api.put<{
        success: boolean;
        message: string;
        data: PublicStory;
      }>(`/stories/${storyId}`, formData);

      setStoryMessage(
          response.message || "Story note updated for admin approval.",
      );

      setMyStories((current) =>
          current.map((story) => (story.id === storyId ? response.data : story)),
      );
    } catch (error) {
      setStoryMessage(
          error instanceof Error ? error.message : "Unable to update story note.",
      );
    }
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactLoading(true);
    setContactMessage("");

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        data: unknown;
      }>("/contact", contact);

      setContactMessage(
          response.message ||
          "Your private consultation request has been received.",
      );
      setContact({ name: "", email: "", message: "" });
    } catch (error) {
      setContactMessage(
          error instanceof Error
              ? error.message
              : "Unable to submit your consultation request right now.",
      );
    } finally {
      setContactLoading(false);
    }
  }

  return (
      <div className="luxury-home">
        <section
            className="cinematic-hero"
            id="home"
            aria-label="Age of Scent hero carousel"
        >
          <div className="hero-carousel" aria-hidden="true">
            {heroSlides.map((slide, index) => (
                <img
                    key={slide.src}
                    src={slide.src}
                    alt={slide.alt}
                    className={`hero-carousel__slide ${
                        index === heroSlideIndex ? "is-active" : ""
                    }`}
                />
            ))}
          </div>

          <div
              className="hero-parallax hero-parallax--back"
              style={{ transform: `translate3d(0, ${scrollY * 0.18}px, 0)` }}
          />
          <div
              className="hero-parallax hero-parallax--mid"
              style={{ transform: `translate3d(0, ${scrollY * 0.08}px, 0)` }}
          />

          <div className="cinematic-hero__content cinematic-hero__content--carousel">
            <div
                className="cinematic-hero__copy hero-copy-window reveal is-visible"
            >
              <div className="window-titlebar hero-copy-window__titlebar">
                <div className="window-titlebar__caption">
                  <span className="window-dot" />
                  <span>Age of Scent Story</span>
                </div>

              </div>

              <div className="hero-copy-window__body">
                    <p className="eyebrow">Age of Scent</p>
                    <h1>The energy of youth in every spray</h1>
                    <p className="hero-lede">
                      Because your best years deserve to be remembered by a scent
                      that lasts.
                    </p>

                    <div className="hero-actions">
                      <Link href="/shop" className="btn">
                        Shop Perfumes
                      </Link>
                      <Link href="#story" className="btn btn--ghost">
                        Read Story
                      </Link>
                    </div>
              </div>
            </div>

            <div className="hero-mobile-product-preview" aria-hidden="true">
              <img
                  src={heroSlides[heroSlideIndex].src}
                  alt=""
                  className="hero-mobile-product-preview__image"
              />
            </div>
          </div>

          <button
              className="hero-arrow hero-arrow--prev"
              type="button"
              aria-label="Show previous fragrance background"
              onClick={() => moveHeroSlide(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>

          <button
              className="hero-arrow hero-arrow--next"
              type="button"
              aria-label="Show next fragrance background"
              onClick={() => moveHeroSlide(1)}
          >
            <span aria-hidden="true">›</span>
          </button>

          <div className="hero-dots" aria-label="Hero carousel slides">
            {heroSlides.map((slide, index) => (
                <button
                    key={slide.src}
                    className={`hero-dot ${
                        index === heroSlideIndex ? "is-active" : ""
                    }`}
                    type="button"
                    aria-label={`Show slide ${index + 1}`}
                    aria-current={index === heroSlideIndex ? "true" : undefined}
                    onClick={() => chooseHeroSlide(index)}
                />
            ))}
          </div>

          <a
              className="scroll-cue"
              href="#story"
              aria-label="Scroll to brand story"
          >
            <span />
            Begin the story
          </a>
        </section>

        <section className="story-section section-pad" id="story">
          <div className="section-kicker reveal">The Maison</div>

          <div className="story-share-strip reveal">
            <div className="story-share-strip__top">
              <div>
                <p className="eyebrow">Client Stories</p>
                <h3>Share your scent moment for 24 hours.</h3>
                <p className="muted">
                  Add a photo and short note about your perfume experience. Admin
                  approval is required before it appears.
                </p>
              </div>

              <div className="form-group story-top-search">
                <label htmlFor="story-search">Search stories</label>
                <input
                    id="story-search"
                    value={storySearchTerm}
                    onChange={(event) => setStorySearchTerm(event.target.value)}
                    placeholder="Search client stories..."
                />
              </div>
            </div>

            <div className="client-story-row">
              {filteredStories.map((story) => (
                  <article className="client-story" key={story.id}>
                    <img
                        src={mediaUrl(story.imageUrl)}
                        alt={`${story.userName} story`}
                    />
                    <div>
                      <strong>{story.userName}</strong>
                      {story.note ? <p>{story.note}</p> : null}
                    </div>
                  </article>
              ))}

              {filteredStories.length === 0 ? (
                  <p className="muted">
                    No approved stories match your search yet.
                  </p>
              ) : null}
            </div>

            <form className="story-submit-form" onSubmit={handleStorySubmit}>
              <label className="upload-field upload-field--story">
                <span className="upload-field__button">Choose file</span>
                <span className="upload-field__name">
                {storyFile ? storyFile.name : "No file chosen"}
              </span>
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => chooseStoryFile(event.target.files?.[0])}
                />
              </label>

              <input
                  value={storyNote}
                  maxLength={240}
                  onChange={(event) => setStoryNote(event.target.value)}
                  placeholder={
                    authUserName
                        ? `Add a note, ${authUserName}`
                        : "Login and add a story note"
                  }
              />

              {storyPreview ? (
                  <img
                      className="story-submit-preview"
                      src={storyPreview}
                      alt="Selected story"
                  />
              ) : null}

              <button
                  className="btn btn--small"
                  type="submit"
                  disabled={storyLoading}
              >
                {storyLoading ? "Submitting..." : "Submit Story"}
              </button>
            </form>

            {storyMessage ? <p className="muted">{storyMessage}</p> : null}
          </div>

          <div className="story-grid">
            <div className="story-copy reveal">
              <p className="eyebrow">Brand Story</p>
              <h2>The Fragrance of the Filipino Grind</h2>
              <p className="muted large-copy">
                Because the hustle never stops, and neither should your scent.
                Whether you’re a student chasing a degree, a driver navigating the
                heat of the highway, or a worker keeping the world moving your day
                is long, demanding, and tough. But no matter how hard the
                &quot;grind&quot; gets, you deserve to feel at your best.
              </p>
            </div>

            <div className="story-panel reveal">
              <p>
                Age of Scent is for the everyday heroes. It’s for the people who
                wake up before the sun and come home long after it sets. We didn’t
                just create a perfume; we created a shield against the heat, the
                dust, and the exhaustion of daily life.
              </p>
            </div>
          </div>

          <div className="story-steps">
            {storySteps.map((step, index) => (
                <article
                    className="story-step reveal"
                    key={step.number}
                    style={{ "--reveal-delay": `${index * 120}ms` } as CSSProperties}
                >
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p className="muted">{step.text}</p>
                </article>
            ))}
          </div>
        </section>
      </div>
  );
}