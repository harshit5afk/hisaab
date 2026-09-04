import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'hisaab-root',
  template: `<router-outlet />`,
  styles: [`:host { display: block; height: 100vh; }`],
})
export class App {}
