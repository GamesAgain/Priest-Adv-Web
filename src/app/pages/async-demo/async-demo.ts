import { Component } from '@angular/core';

@Component({
  selector: 'app-async-demo',
  imports: [],
  templateUrl: './async-demo.html',
  styleUrl: './async-demo.scss'
})
export class AsyncDemo {
    btnClick() {
    this.normalFunction('1' + new Date());
    this.normalFunction('2' + new Date());

    this.delay(2000).then(() => {
      console.log('3 ' + new Date());
      this.delay(2000).then(() => {
        console.log('4 ' + new Date());
      });
    });

     console.log('5 ' + new Date());
  }
  delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }
  normalFunction(arg0: string) {
    throw new Error('Method not implemented.');
  }
}
