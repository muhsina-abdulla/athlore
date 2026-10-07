# Athlore

> A personal MMA training intelligence system for logging sessions, understanding progress, discovering patterns, and learning from my training history.

## What is Athlore?

Athlore is a personal project I am building for myself.

I train MMA as a hobby, but it has become a meaningful part of my life. I expect training to remain an important part of my life for a long time, so I wanted a better way to understand my own training journey.

Athlore brings my training journal, progress tracking, analytics, milestones, and training intelligence into one place.

The goal is not just to record that I trained. I want to understand how I train, how I am progressing, and what my training history can tell me.

## Why Iam building it

I originally logged my MMA sessions using a Google Form, with the responses collected in a spreadsheet.

I recorded things such as what I trained, how long I trained, techniques I learned, how I felt about the session, coach feedback, my mood, and what I wanted to improve.

After building up a significant amount of training logs, I started running Gemini over the spreadsheet.

That made me realize that the data contained patterns and relationships that were difficult to see by looking at individual sessions. I could ask questions about my training history and get insights that I would not have noticed from the spreadsheet alone.

That led me to the idea of building a single place where I could:

- Log my training
- See and measure my progress
- Analyze my training history
- Discover patterns
- Get training intelligence on the go
- Use my history to help think about upcoming training

I also wanted a better way to see my journey. Being able to see how far I have come and what I am working toward next is motivating to me.

To support that, Athlore will have a visual milestone progression system. The idea is inspired by the progression map in games such as Candy Crush, where progress is represented as a journey through milestones rather than only as numbers or charts.

## What Athlore will do

### Training journal

Record MMA sessions and capture the information that matters to me about each session.

### Progress tracking

Track my training history, goals, milestones, and development over time.

### Analytics

Explore relationships and trends across training data, such as:

- Mood and performance
- Training duration and performance
- Training frequency and progress
- Discomfort and performance
- Session type and performance

These relationships will be used to help identify patterns, not to assume that one factor causes another.

### Training intelligence

Use my accumulated training history to answer questions, surface patterns, revisit things I have previously learned, and help me understand my development.

### Training planning

Eventually, Athlore will also help me use what I have learned from my training history when thinking about upcoming sessions and training plans.

## Initial logging model

The initial logging model is based on the system I already use.

The first version will preserve the metrics I currently record, including:

- Training date
- Training focus
- Duration
- Technique or skill learned
- Self-assessment
- Coach feedback
- Injury or discomfort notes
- Self-rating
- Mood
- What I'm proud of
- What I need to improve

My existing training history will be migrated into Athlore as part of the initial setup.

In the future, I am considering allowing athletes to define their own logging metrics and choose what they want to track. This will be considered as the product evolves, but it is not part of the MVP.

## Current status

Athlore is in early development.

The project is currently being built with React Native, Expo, and TypeScript. The first project foundation and GitHub repository have been set up, and the core product is now being built.

## Tech stack

- React Native
- Expo
- TypeScript

The technology choices may evolve as the project develops.

## Getting started

### Prerequisites

- Node.js
- npm
- Expo Go on an Android device for development

### Install

```bash
npm install
